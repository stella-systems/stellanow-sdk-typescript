// Copyright (C) 2025 Stella Technologies (UK) Limited.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

import { Mutex } from 'async-mutex';
import type { MqttClient, Packet } from 'mqtt';
import { nanoid } from 'nanoid';

import type { IMqttAuthStrategy } from './auth-strategies/i-mqtt-auth-strategy.js';
import type { EventKey, StellaNowEventWrapper } from '../../core/events.js';
import { StellaNowSignal } from '../../core/stellanow-signal.js';
import type {
    StellaNowEnvironmentConfig,
    ILogger
} from '../../types/index.js';
import type { IStellaNowSink } from '../i-stellanow-sink.js';

class MqttConnectionException extends Error {
    constructor(message: string, brokerUrl?: string) {
        super(`${message}${brokerUrl ? ` (Broker: ${brokerUrl})` : ''}`);
        this.name = 'MqttConnectionException';
    }
}

/**
 * An MQTT-based sink for StellaNow messages, handling connection, disconnection,
 * and message publishing to the broker.
 * @remarks Uses a specified IMqttAuthStrategy to handle authentication or no-auth connections,
 * and manages reconnection if the broker disconnects.
 */
class StellaNowMqttSink implements IStellaNowSink {
    public readonly OnConnected: StellaNowSignal<() => void> = new StellaNowSignal();
    public readonly OnDisconnected: StellaNowSignal<() => void> = new StellaNowSignal();
    public readonly OnError: StellaNowSignal<(message: string) => void> = new StellaNowSignal();
    public readonly OnMessageAck: StellaNowSignal<(eventKey: EventKey) => void> = new StellaNowSignal<(eventKey: EventKey) => void>();

    private mqttClient: MqttClient | null = null;
    private mutex = new Mutex();
    private reconnectCancellationTokenSource?: { cancel: () => void; token: { isCancelled: boolean } };
    private reconnectMonitorTask?: Promise<void>;
    private static readonly BaseReconnectDelayMs = 5000; // 5 seconds
    private static readonly MaxReconnectDelayMs = 60000; // 60 seconds

    /**
     * Initializes a new instance of the StellaNowMqttSink.
     * @param logger The logger instance for logging events.
     * @param authStrategy The authentication strategy for MQTT connections.
     * @param stellaNowConfig The configuration containing organization and project IDs.
     * @param envConfig The environment configuration with broker details.
     * @throws {Error} If any parameter is null or invalid.
     */
    constructor(
        private logger: ILogger,
        private authStrategy: IMqttAuthStrategy,
        private stellaNowConfig: { organizationId: string },
        private envConfig: StellaNowEnvironmentConfig,
    ) {
        if (!logger || !authStrategy || !stellaNowConfig || !envConfig || !stellaNowConfig.organizationId || !envConfig.brokerUrl) {
            throw new Error('Invalid constructor parameters');
        }

        // Validate broker URL
        try {
            new URL(envConfig.brokerUrl);
        } catch {
            throw new Error(`Broker URL is not a valid URI: ${envConfig.brokerUrl}`);
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

        this.mqttClient.on('disconnect', () => {
            this.logger.info('Disconnected from MQTT broker');
            this.OnDisconnected.trigger();
        });

        this.mqttClient.on('error', (err) => {
            this.handleError(`MQTT error: ${err.message}`);
        });
    }

    public async Start(): Promise<void> {
        const release = await this.mutex.acquire();
        try {
            if (this.reconnectCancellationTokenSource) {
                throw new Error('Sink is already started');
            }

            this.reconnectCancellationTokenSource = {
                cancel: () : void => {
                    if (this.reconnectCancellationTokenSource) this.reconnectCancellationTokenSource.token.isCancelled = true;
                },
                token: { isCancelled: false },
            };
            if (!this.mqttClient) {
                this.mqttClient = await this.authStrategy.getAuthenticatedClient(
                    this.envConfig.brokerUrl,
                    'StellaNowSDK_' + nanoid(10)
                );
                this.setupEventHandlers();
            } else {
                await this.authStrategy.reconnect();
            }
            this.reconnectMonitorTask = this.startReconnectMonitor(this.reconnectCancellationTokenSource.token);

            const initialConnectTimeout = 5000; // 5 seconds
            const startTime = Date.now();
            while (Date.now() - startTime < initialConnectTimeout) {
                if (this.IsConnected) {
                    this.logger.info('Initial connection established successfully');
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            if (!this.IsConnected) {
                this.logger.warn(
                    `Initial connection attempt did not succeed within ${initialConnectTimeout / 1000} seconds. The reconnection monitor will continue trying in the background`
                );
            }
        } catch (err) {
            this.logger.error(`Failed to start MQTT sink: ${String(err)}`);
            throw err;
        } finally {
            release();
        }
    }

    public async Stop(): Promise<void> {
        const release = await this.mutex.acquire();
        try {
            await this.disconnectAsync();
        } catch (err) {
            this.logger.error(`Failed to stop MQTT sink: ${String(err)}`);
            throw err;
        } finally {
            release();
        }
    }

    public async SendMessageAsync(event: StellaNowEventWrapper): Promise<void> {
        const release = await this.mutex.acquire();
        try {
            if (!event) throw new Error('Event cannot be null');
            if (!this.IsConnected) {
                throw new MqttConnectionException('Cannot send message: Sink is not connected', this.envConfig.brokerUrl);
            }

            this.logger.debug(`Sending message with ID: ${event.value.metadata.messageId}`);
            await this.publish(event);
            this.logger.debug(`Message with ID ${event.value.metadata.messageId} sent successfully`);
        } catch (err) {
            this.logger.error(`Failed to send message: ${String(err)}`);
            throw err;
        } finally {
            release();
        }
    }

    /**
     * Cleans up resources used by the sink.
     * @remarks This method should be called manually if the sink is no longer needed to free up resources.
     */
    public dispose(): void {
        this.logger.debug('Disposing StellaNowMqttSink');
        void this.mutex.acquire().then((release) => {
            try {
                if (this.reconnectCancellationTokenSource) {
                    this.reconnectCancellationTokenSource.cancel();
                    if (this.reconnectMonitorTask) {
                        this.reconnectMonitorTask.catch(() => {}); // Handle rejection silently
                    }
                    this.reconnectCancellationTokenSource = undefined;
                }
                if (this.mqttClient) {
                    this.mqttClient.removeAllListeners();
                    this.mqttClient.end();
                    this.mqttClient = null;
                }
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
            if (this.reconnectCancellationTokenSource) {
                this.reconnectCancellationTokenSource.cancel();
                if (this.reconnectMonitorTask) {
                    await this.reconnectMonitorTask;
                }
                this.reconnectCancellationTokenSource = undefined;
            }
            if (this.mqttClient) {
                const client = this.mqttClient; // Local variable to avoid null issues
                await new Promise((resolve) => client.end(resolve)); // Removed non-null assertion
            }
            this.logger.info('Disconnected from MQTT broker');
        } catch (err) {
            this.logger.error(
                `Failed to disconnect from MQTT broker at ${this.envConfig.brokerUrl}: ${String(err)}`
            );
            throw new Error('Failed to disconnect from the MQTT broker');
        }
    }

    private async publish(event: StellaNowEventWrapper): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.mqttClient) {
                reject(new MqttConnectionException('No MQTT client available', this.envConfig.brokerUrl));
                return;
            }
            this.mqttClient.publish(
                this.getTopic(),
                JSON.stringify(event),
                { qos: 1 },
                (error, packet?: Packet) => {
                    if (error) reject(new MqttConnectionException(error.message, this.envConfig.brokerUrl));
                    else {
                        
                        if (packet && packet.cmd == "publish" && packet.messageId) {          
                            this.OnMessageAck.trigger(event.eventKey);
                        }

                        resolve();
                    }
                }
            );
        });
    }

    private getTopic(): string {
        return `in/${this.stellaNowConfig.organizationId}`;
    }

    private async startReconnectMonitor(token: { isCancelled: boolean }): Promise<void> {
        this.logger.info('Started reconnection monitor');
        let attempt = 0;

        try {
            while (!token.isCancelled) {
                try {
                    if (!this.IsConnected && this.mqttClient) {
                        attempt++;
                        this.logger.info(`Attempting to reconnect (Attempt ${attempt})`);
                        await this.authStrategy.reconnect();
                        attempt = 0; // Reset on success
                    }
                } catch (err) {
                    this.logger.error(`Reconnection attempt ${attempt} failed: ${String(err)}`);
                }

                const delayMs = Math.min(
                    StellaNowMqttSink.BaseReconnectDelayMs * 2 ** (attempt - 1),
                    StellaNowMqttSink.MaxReconnectDelayMs
                );
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        } catch (err) {
            this.logger.error(`Unexpected error in reconnection monitor: ${String(err)}`);
            throw err;
        } finally {
            this.logger.info('Reconnection monitor cancelled');
        }
    }

    private handleError(message: string): void {
        this.OnError.trigger(message);
    }
}

export { StellaNowMqttSink, MqttConnectionException };