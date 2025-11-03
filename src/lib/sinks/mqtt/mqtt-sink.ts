// Copyright (C) 2025 Stella Technologies (UK) Limited.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

import { Mutex } from 'async-mutex';
import type { MqttClient, Packet } from 'mqtt';
import mqtt from 'mqtt';
import { nanoid } from 'nanoid';

import type { IMqttAuthStrategy } from './auth-strategies/i-mqtt-auth-strategy.ts';
import { ConnectionState, ConnectionStateManager } from './connection-state.ts';
import { CancellationToken } from '../../core/cancellation-token.ts';
import type { StellaNowEventWrapper } from '../../core/events.ts';
import {
    MqttConnectionException,
    SinkInitializationError,
    SinkOperationError
} from '../../core/exceptions.ts';
import { PerformanceMonitor } from '../../core/performance-monitor.ts';
import { StellaNowSignal } from '../../core/stellanow-signal.ts';
import { SINK_ENV_VARS } from '../../types/constants.ts';
import type {
    StellaNowEnvironmentConfig,
    ILogger
} from '../../types/index.ts';
import type { IStellaNowSink } from '../i-stellanow-sink.ts';

/**
 * An MQTT-based sink for StellaNow messages, handling connection, disconnection,
 * and message publishing to the broker.
 * @remarks Uses a specified IMqttAuthStrategy to handle authentication or no-auth connections,
 * and manages connection lifecycle with a single monitor.
 */
class StellaNowMqttSink implements IStellaNowSink {
    public readonly OnConnected: StellaNowSignal<() => void> = new StellaNowSignal();
    public readonly OnDisconnected: StellaNowSignal<() => void> = new StellaNowSignal();
    public readonly OnError: StellaNowSignal<(message: string) => void> = new StellaNowSignal();
    public readonly OnMessageAck: StellaNowSignal<(eventId: string) => void> = new StellaNowSignal<(eventId: string) => void>();

    private mqttClient: MqttClient | null = null;
    private mutex = new Mutex();
    private connectionMonitorTask?: Promise<void>;
    private cancellationToken?: CancellationToken;
    private connectionState = new ConnectionStateManager();
    private isConnecting = false; // Guards against concurrent connection attempts
    private readonly clientId: string; // Persistent client ID for the entire lifecycle
    private readonly maxReconnectAttempts: number | null; // null = infinite retries
    private static readonly BaseReconnectDelayMs = 2500; // 2.5 seconds
    private static readonly MaxReconnectDelayMs = 30000; // 30 seconds

    private readonly performanceMonitor: PerformanceMonitor | null = null;

    /**
     * Initializes a new instance of the StellaNowMqttSink.
     * @param logger The logger instance for logging events.
     * @param authStrategy The authentication strategy for MQTT connections.
     * @param stellaNowConfig The configuration containing organization and project IDs.
     * @param envConfig The environment configuration with broker details.
     * @param performanceMonitorOn - This will instantiate PerformanceMonitor instance for the sink to see how many messages are being dispatched per second.
     * @throws {SinkInitializationError} If any parameter is null or invalid, or if the broker URL is invalid.
     */
    constructor(
        private logger: ILogger,
        private authStrategy: IMqttAuthStrategy,
        private stellaNowConfig: { organizationId: string },
        private envConfig: StellaNowEnvironmentConfig,
        performanceMonitorOn: boolean = false
    ) {
        if (!logger || !authStrategy || !stellaNowConfig || !envConfig || !stellaNowConfig.organizationId || !envConfig.brokerUrl) {
            throw new SinkInitializationError('Invalid constructor parameters');
        }

        // Validate broker URL
        try {
            new URL(envConfig.brokerUrl);
        } catch {
            throw new SinkInitializationError(`Broker URL is not a valid URI: ${envConfig.brokerUrl}`);
        }

        if(performanceMonitorOn) {
            this.performanceMonitor = new PerformanceMonitor(this.logger);
        }

        this.cancellationToken = new CancellationToken();
        this.clientId = this.generateClientId();

        const reconnectLimitEnv = process.env[SINK_ENV_VARS.RECONNECT_LIMIT];
        if (reconnectLimitEnv) {
            const parsed = parseInt(reconnectLimitEnv, 10);
            this.maxReconnectAttempts = isNaN(parsed) || parsed <= 0 ? null : parsed;
        } else {
            this.maxReconnectAttempts = null;
        }

        this.logger.info(`Generated MQTT clientId: ${this.clientId}`);
        this.logger.info(`Max reconnect attempts: ${this.maxReconnectAttempts === null ? 'infinite' : this.maxReconnectAttempts}`);
    }

    /**
     * Gets a value indicating whether the sink is currently connected to the broker.
     * @readonly
     */
    public get IsConnected(): boolean {
        return this.connectionState.isConnected && (this.mqttClient?.connected ?? false);
    }

    /**
     * Generates a unique MQTT client ID.
     * Format: "StellaNowSdkTS_{nanoid}_{SDK_NAME}" or "StellaNowSdkTS_{nanoid}" if SDK_NAME not set.
     * @private
     * @returns {string} The generated client ID.
     */
    private generateClientId(): string {
        const hash = nanoid(10);
        const sdkName = process.env.SDK_NAME;
        return sdkName ? `StellaNowSdkTS_${hash}_${sdkName}` : `StellaNowSdkTS_${hash}`;
    }

    private setupEventHandlers(): void {
        if (!this.mqttClient) return;

        this.mqttClient.on('connect', () => {
            this.logger.info('Connected to MQTT broker');
            this.connectionState.tryTransition(ConnectionState.CONNECTED);
            this.isConnecting = false;
            this.OnConnected.trigger();
        });

        this.mqttClient.on('disconnect', (packet?: Packet) => {
            this.logger.info(`Disconnected from MQTT broker: ${packet ? JSON.stringify(packet) : 'No packet'}`);
            this.connectionState.forceState(ConnectionState.DISCONNECTED);
            this.isConnecting = false;
            this.OnDisconnected.trigger();
        });

        this.mqttClient.on('error', (err) => {
            this.handleError(`MQTT error: ${err.message}`);
            if (this.connectionState.isConnecting) {
                this.connectionState.forceState(ConnectionState.DISCONNECTED);
                this.isConnecting = false;
            }
        });

        this.mqttClient.on('close', () => {
            this.logger.info('MQTT connection closed');
            this.connectionState.forceState(ConnectionState.DISCONNECTED);
            this.isConnecting = false;
        });

        this.mqttClient.on('offline', () => {
            this.logger.info('MQTT client went offline');
            this.connectionState.forceState(ConnectionState.DISCONNECTED);
        });

        this.mqttClient.on('reconnect', () => {
            this.logger.info('MQTT client attempting to reconnect');
        });
    }

    public async start(): Promise<void> {
        const release = await this.mutex.acquire();
        if (this.connectionMonitorTask) {
            release();
            this.logger.error('Failed to start MQTT sink: Sink is already started');
            throw new SinkInitializationError('Sink is already started');
        }

        try {
            if (!this.mqttClient) {
                this.mqttClient = mqtt.connect(this.envConfig.brokerUrl, {
                    clientId: this.clientId,
                    username: '',   // Will be populated in the auth strategy
                    password: '',   // Will be populated in the auth strategy
                    clean: true,
                    protocolVersion: 5,
                    manualConnect: true,
                    reconnectPeriod: 0, // Disable auto-reconnect, we handle reconnection manually
                });
                this.setupEventHandlers();
            }

            this.cancellationToken = new CancellationToken();
            this.connectionMonitorTask = this.startConnectionMonitor(this.cancellationToken);
        } catch (err) {
            this.logger.error(`Failed to start MQTT sink: ${String(err)}`);
            throw err;
        } finally {
            release();
        }
    }

    public async stop(): Promise<void> {
        const release = await this.mutex.acquire();
        try {
            await this.disconnectAsync();
        } catch (err) {
            this.logger.error(`Failed to stop MQTT sink: ${String(err)}`);
            throw new SinkOperationError(`Failed to stop: ${String(err)}`, err);
        } finally {
            release();
        }
    }

    public async sendMessageAsync(event: StellaNowEventWrapper): Promise<void> {
        if (!event) {
            this.logger.error('Failed to publish message: Event cannot be null');
            throw new SinkOperationError('Event cannot be null');
        }

        try {
            this.logger.debug(`Publishing message with ID: ${event.value.metadata.messageId}`);
            await this.publish(event);
            this.logger.debug(`Message with ID ${event.value.metadata.messageId} published successfully`);
        } catch (err) {
            this.logger.error(`Failed to publish message: ${String(err)}`);
            throw err;
        }
    }

    /**
     * Cleans up resources used by the sink.
     * @remarks This method should be called manually if the sink is no longer needed to free up resources.
     * @returns A promise that resolves when disposal is complete.
     */
    public async dispose(): Promise<void> {
        this.logger.debug('Disposing StellaNowMqttSink');
        const release = await this.mutex.acquire();

        try {
            if (this.cancellationToken) {
                this.cancellationToken.cancel();
            }

            if (this.connectionMonitorTask) {
                try {
                    await this.connectionMonitorTask;
                } catch (err) {
                    this.logger.debug(`Connection monitor task ended with error (expected): ${String(err)}`);
                }
            }

            if (this.mqttClient) {
                await new Promise<void>((resolve) => {
                    this.mqttClient!.end(true, {}, () => resolve());
                });
                this.mqttClient.removeAllListeners();
                this.mqttClient = null;
            }

            this.connectionMonitorTask = undefined;
            this.cancellationToken = undefined;
            this.connectionState.reset();
            this.isConnecting = false;

            this.logger.debug('StellaNowMqttSink disposed successfully');
        } catch (err) {
            this.logger.error(`Failed to dispose MQTT sink: ${String(err)}`);
            throw new SinkOperationError('Failed to dispose sink', err);
        } finally {
            release();
        }
    }

    private async disconnectAsync(): Promise<void> {
        try {
            this.logger.info('Disconnecting from MQTT broker');
            if (this.cancellationToken) {
                this.cancellationToken.cancel();
            }
            if (this.connectionMonitorTask) {
                await this.connectionMonitorTask;
            }
            if (this.mqttClient) {
                const client = this.mqttClient; // Local variable to avoid null issues
                await new Promise((resolve) => client.end(true, {}, resolve));
            }
            this.logger.info('Disconnected from MQTT broker');
            this.connectionMonitorTask = undefined;
            this.cancellationToken = undefined;
        } catch (err) {
            this.logger.error(`Failed to disconnect from MQTT broker at ${this.envConfig.brokerUrl}: ${String(err)}`);
            throw new SinkOperationError('Failed to disconnect from the MQTT broker', err);
        }
    }

    private async publish(event: StellaNowEventWrapper): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.mqttClient) {
                reject(new MqttConnectionException('No MQTT client available', this.envConfig.brokerUrl));
                return;
            }

            if (!this.connectionState.isConnected || !this.mqttClient.connected) {
                reject(new MqttConnectionException('Cannot publish message: Sink is not connected', this.envConfig.brokerUrl));
                return;
            }

            if(this.performanceMonitor) {
                this.performanceMonitor.recordEvent();
            }

            this.mqttClient.publish(
                this.getTopic(),
                JSON.stringify(event),
                { qos: 1 },
                (error) => {
                    if (error) {
                        reject(new MqttConnectionException(error.message, this.envConfig.brokerUrl));
                    } else {
                        this.OnMessageAck.trigger(event.value.metadata.messageId);
                        resolve();
                    }
                }
            );
        });
    }

    private getTopic(): string {
        return `in/${this.stellaNowConfig.organizationId}`;
    }

    private async mqttConnect(): Promise<void> {
        const client = this.mqttClient; // Local variable to avoid null issues in callbacks
        return new Promise<void>((resolve, reject) => {
            if (client === null) {
                reject(new MqttConnectionException('MQTT client is null'));
                return;
            }

            if (!this.connectionState.tryTransition(ConnectionState.CONNECTING)) {
                reject(new MqttConnectionException('Invalid state transition to CONNECTING'));
                return;
            }

            const onConnect = (): void => {
                client.off('connect', onConnect);
                client.off('error', onError);
                resolve();
            };

            const onError = (err: Error): void => {
                client.off('connect', onConnect);
                client.off('error', onError);
                this.connectionState.forceState(ConnectionState.DISCONNECTED);
                reject(new MqttConnectionException(err.message));
            };

            client.on('connect', onConnect);
            client.on('error', onError);
            client.connect();
        });
    }

    private async startConnectionMonitor(cancellationToken: { isCancelled: boolean }): Promise<void> {
        this.logger.info('Started connection monitor');
        let attempt = 0;
        let consecutiveFailures = 0;

        try {
            while (!cancellationToken.isCancelled) {
                if (!this.IsConnected && this.mqttClient && !this.isConnecting) {
                    if (this.maxReconnectAttempts !== null && consecutiveFailures >= this.maxReconnectAttempts) {
                        this.logger.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping connection monitor.`);
                        this.OnError.trigger(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
                        break;
                    }

                    this.isConnecting = true;
                    attempt++;
                    consecutiveFailures++;

                    try {
                        const attemptInfo = this.maxReconnectAttempts === null
                            ? `Attempt ${attempt}`
                            : `Attempt ${attempt}/${this.maxReconnectAttempts}`;
                        this.logger.info(`Attempting connection (${attemptInfo})`);
                        await this.authStrategy.auth(this.mqttClient, this.clientId);
                        await this.mqttConnect();
                        attempt = 0; // Reset on success
                        consecutiveFailures = 0; // Reset consecutive failures counter
                        this.isConnecting = false;
                    } catch (err) {
                        this.logger.error(`Connection attempt ${attempt} failed: ${String(err)}`);
                        this.isConnecting = false;
                        this.connectionState.forceState(ConnectionState.DISCONNECTED);
                    }
                }

                // Only log retry and delay if a connection attempt is needed
                if (!this.IsConnected && this.mqttClient && !this.isConnecting) {
                    if (this.maxReconnectAttempts !== null && consecutiveFailures >= this.maxReconnectAttempts) {
                        break;
                    }

                    const delayMs = Math.min(
                        StellaNowMqttSink.BaseReconnectDelayMs * 2 ** (consecutiveFailures - 1),
                        StellaNowMqttSink.MaxReconnectDelayMs
                    );
                    const attemptsInfo = this.maxReconnectAttempts === null
                        ? `${consecutiveFailures} attempts`
                        : `${consecutiveFailures}/${this.maxReconnectAttempts} attempts`;
                    this.logger.info(`Retrying connection in ${delayMs / 1000} seconds... (${attemptsInfo})`);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 2500));
                }
            }
        } catch (err) {
            this.logger.error(`Unexpected error in connection monitor: ${String(err)}`);
            this.isConnecting = false;
            throw new SinkOperationError('Unexpected error in connection monitor', err);
        } finally {
            this.logger.info('Connection monitor cancelled');
            this.isConnecting = false;
        }
    }

    private handleError(message: string): void {
        this.OnError.trigger(message);
    }
}

export { StellaNowMqttSink };
