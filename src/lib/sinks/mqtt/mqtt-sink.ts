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

import type { IMqttAuthStrategy } from './auth-strategies/i-mqtt-auth-strategy.ts';
import type { StellaNowEventWrapper } from '../../core/events.ts';
import {
    MqttConnectionException,
    SinkInitializationError,
    SinkOperationError
} from '../../core/exceptions.ts';
import { StellaNowSignal } from '../../core/stellanow-signal.ts';
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
    private cancellationToken: { isCancelled: boolean } | null = null;
    private static readonly BaseReconnectDelayMs = 5000; // 5 seconds
    private static readonly MaxReconnectDelayMs = 60000; // 60 seconds

    /**
     * Initializes a new instance of the StellaNowMqttSink.
     * @param logger The logger instance for logging events.
     * @param authStrategy The authentication strategy for MQTT connections.
     * @param stellaNowConfig The configuration containing organization and project IDs.
     * @param envConfig The environment configuration with broker details.
     * @throws {SinkInitializationError} If any parameter is null or invalid, or if the broker URL is invalid.
     */
    constructor(
        private logger: ILogger,
        private authStrategy: IMqttAuthStrategy,
        private stellaNowConfig: { organizationId: string },
        private envConfig: StellaNowEnvironmentConfig,
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
    }

    /**
     * Gets a value indicating whether the sink is currently connected to the broker.
     * @readonly
     */
    public get IsConnected(): boolean {
        return this.mqttClient?.connected ?? false;
    }

    private setupEventHandlers(): void {
        if (!this.mqttClient) return;

        this.mqttClient.on('connect', () => {
            this.logger.info('Connected to MQTT broker');
            this.OnConnected.trigger();
        });

        this.mqttClient.on('disconnect', (packet?: Packet) => {
            this.logger.info(`Disconnected from MQTT broker: ${packet ? JSON.stringify(packet) : 'No packet'}`);
            this.OnDisconnected.trigger();
        });

        this.mqttClient.on('error', (err) => {
            this.handleError(`MQTT error: ${err.message}`);
        });

        this.mqttClient.on('close', () => {
            this.logger.info('MQTT connection closed');
        });

        this.mqttClient.on('offline', () => {
            this.logger.info('MQTT client went offline');
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
                    username: '',   // Will be populated in the auth strategy
                    password: '',   // Will be populated in the auth strategy
                    clean: true,
                    protocolVersion: 5,
                    manualConnect: true,
                });
                this.setupEventHandlers();
            }

            this.cancellationToken = { isCancelled: false };
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

    public sendMessage(event: StellaNowEventWrapper): void {
        if (!event) {
            this.logger.error('Failed to publish message: Event cannot be null');
            throw new SinkOperationError('Event cannot be null');
        }
        if (!this.IsConnected) {
            this.logger.error('Failed to publish message: Sink is not connected');
            throw new MqttConnectionException('Cannot publish message: Sink is not connected', this.envConfig.brokerUrl);
        }

        try {
            this.logger.debug(`Publishing message with ID: ${event.value.metadata.messageId}`);
            this.publish(event);
        } catch (err) {
            this.logger.error(`Failed to publish message: ${String(err)}`);
            throw err;
        }
    }

    /**
     * Cleans up resources used by the sink.
     * @remarks This method should be called manually if the sink is no longer needed to free up resources.
     */
    public dispose(): void {
        this.logger.debug('Disposing StellaNowMqttSink');
        void this.mqttClient?.end(true, {}, () => {});
        void this.mutex.acquire().then((release) => {
            try {
                if (this.cancellationToken) {
                    this.cancellationToken.isCancelled = true;
                }
                if (this.connectionMonitorTask) {
                    this.connectionMonitorTask.catch(() => {}); // Handle rejection silently
                }
                if (this.mqttClient) {
                    this.mqttClient.removeAllListeners();
                    this.mqttClient.end();
                    this.mqttClient = null;
                }
                this.connectionMonitorTask = undefined;
                this.cancellationToken = null;
            } catch (err) {
                this.logger.error(`Failed to dispose MQTT sink: ${String(err)}`);
            } finally {
                release(); // Call the release function returned by acquire
            }
        });
    }

    private async disconnectAsync(): Promise<void> {
        try {
            this.logger.info('Disconnecting from MQTT broker');
            if (this.cancellationToken) {
                this.cancellationToken.isCancelled = true;
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
            this.cancellationToken = null;
        } catch (err) {
            this.logger.error(`Failed to disconnect from MQTT broker at ${this.envConfig.brokerUrl}: ${String(err)}`);
            throw new SinkOperationError('Failed to disconnect from the MQTT broker', err);
        }
    }

    count = 0;

    /*
    Need to remove the resolve after ack 
    - How does this bubble up through the API?
    - What does the user get to know that a specific message was delivered?
    - How are errors handled? and how are things re-sent if needed?
    */
    private publish(event: StellaNowEventWrapper): void {
        if (!this.mqttClient) {
            throw new MqttConnectionException('No MQTT client available', this.envConfig.brokerUrl);
        }

        this.mqttClient.publish(
            this.getTopic(),
            JSON.stringify(event),
            { qos: 1 },
            (error, packet?: Packet) => {
                if (error) {
                    // When we detect an error, we end the connection. This will trigger the connection
                    // monitor which will then initiate the reconnection logic.
                    // This is transparent to consumers of this class.
                    this.logger.warn("MQTT publish error");
                    this.mqttClient?.end(true);
                    // TODO: Might need to use this.mqttClient?.reconnect();
                } else {
                    if (packet && packet.cmd === 'publish' && packet.messageId) {
                        this.count++;
                        this.OnMessageAck.trigger(event.value.metadata.messageId);
                    }
                }
            }
        );
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

            const onConnect = (): void => {
                client.off('connect', onConnect);
                client.off('error', onError);
                resolve();
            };

            const onError = (err: Error): void => {
                client.off('connect', onConnect);
                client.off('error', onError);
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

        try {
            while (!cancellationToken.isCancelled) {
                if (!this.IsConnected && this.mqttClient) {
                    attempt++;
                    try {
                        this.logger.info(`Attempting connection (Attempt ${attempt})`);
                        await this.authStrategy.auth(this.mqttClient);
                        await this.mqttConnect();
                        attempt = 0; // Reset on success
                    } catch (err) {
                        this.logger.error(`Connection attempt ${attempt} failed: ${String(err)}`);
                    }
                }

                // Only log retry and delay if a connection attempt is needed
                if (!this.IsConnected && this.mqttClient) {
                    const delayMs = Math.min(
                        StellaNowMqttSink.BaseReconnectDelayMs * 2 ** (attempt - 1),
                        StellaNowMqttSink.MaxReconnectDelayMs
                    );
                    this.logger.info(`Retrying connection in ${delayMs / 1000} seconds...`);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                } else {
                    // If connected, wait a shorter interval before checking again
                    await new Promise((resolve) => setTimeout(resolve, 2500));
                }
            }
        } catch (err) {
            this.logger.error(`Unexpected error in connection monitor: ${String(err)}`);
            throw new SinkOperationError('Unexpected error in connection monitor', err);
        } finally {
            this.logger.info('Connection monitor cancelled');
        }
    }

    private handleError(message: string): void {
        this.OnError.trigger(message);
    }
}

export { StellaNowMqttSink };