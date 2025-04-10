// Copyright (C) 2022-2025 Stella Technologies (UK) Limited.
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

import { StellaNowEventWrapper } from './core/events.ts';
import { SdkCreationError } from './core/exceptions.ts';
import type { IStellaNowMessageSource} from './core/message-source.ts';
import { FifoQueue } from './core/message-source.ts';
import type { StellaNowMessageBase } from './core/messages.ts';
import { StellaNowMessageWrapper } from './core/messages.ts';
import type { StellaNowSignal } from './core/stellanow-signal.ts';
import type { IStellaNowSink } from './sinks/i-stellanow-sink.ts';
import {OidcMqttAuthStrategy} from './sinks/mqtt/auth-strategies/oidc-mqtt-auth-strategy.ts';
import {StellaNowMqttSink} from './sinks/mqtt/mqtt-sink.ts';
import type {
    StellaNowProjectInfo,
    ILogger,
    StellaNowCredentials, StellaNowEnvironmentConfig
} from './types/index.ts';
import {
    EnvConfig,
    Credentials,
    ProjectInfo
} from './types/index.ts';

/**
 * The main SDK class for managing message sending and receiving in the StellaNow system.
 * @remarks This class coordinates with a sink for publishing messages and a source for
 * managing message queues, providing event handling and error tracking.
 */
class StellaNowSDK {
    /**
     * A signal emitted when the sink successfully connects to the broker.
     * @type {StellaNowSignal<() => void>}
     * @example
     * sdk.OnConnected.subscribe(() => console.log('Connected to broker'));
     */
    public readonly OnConnected: StellaNowSignal<() => void>;

    /**
     * A signal emitted when the sink disconnects from the broker.
     * @type {StellaNowSignal<() => void>}
     * @example
     * sdk.OnDisconnected.subscribe(() => console.log('Disconnected from broker'));
     */
    public readonly OnDisconnected: StellaNowSignal<() => void>;

    /**
     * A signal emitted when an error occurs in the SDK or sink.
     * @type {StellaNowSignal<(message: string) => void>}
     * @param message - The error message describing the issue.
     * @example
     * sdk.OnError.subscribe((msg) => console.error('Error:', msg));
     */
    public readonly OnError: StellaNowSignal<(message: string) => void>;

    /**
     * Initializes a new instance of the StellaNowSDK.
     * @param projectInfo - The project configuration containing organization and project details.
     * @param sink - The sink implementation for publishing messages to the broker.
     * @param source - The message source for managing the message queue.
     * @param logger - The logger instance for logging events and errors.
     */
    constructor(
        private projectInfo: StellaNowProjectInfo,
        private sink: IStellaNowSink,
        private source: IStellaNowMessageSource,
        private logger: ILogger
    ) {
        this.OnConnected = sink.OnConnected;
        this.OnDisconnected = sink.OnDisconnected;
        this.OnError = sink.OnError;

        sink.OnMessageAck.subscribe((eventId) => source.markMessageAck(eventId));

        setInterval(() => {
            this.eventLoop().catch((err) => {
                this.logger.error(`Event loop failed: ${String(err)}`);
            });
        }, 10);
    }

    /**
     * Starts the SDK by initiating the sink's connection to the broker.
     * @returns {Promise<void>} A promise that resolves when the SDK is started.
     * @throws {Error} If the sink fails to start or is already running.
     * @example
     * await sdk.start();
     */
    public async start(): Promise<void> {
        try {
            await this.sink.start();
            this.logger.info('StellaNowSDK started successfully');
        } catch (err) {
            this.logger.error(`Failed to start StellaNowSDK: ${String(err)}`);
            throw err;
        }
    }

    /**
     * Stops the SDK by terminating the sink's connection to the broker.
     * @returns {Promise<void>} A promise that resolves when the SDK is stopped.
     * @throws {Error} If the sink fails to stop or is not running.
     * @example
     * await sdk.stop();
     */
    public async stop(): Promise<void> {
        try {
            await this.sink.stop();
            this.logger.info('StellaNowSDK stopped successfully');
        } catch (err) {
            this.logger.error(`Failed to stop StellaNowSDK: ${String(err)}`);
            throw err;
        }
    }

    /**
     * Enqueues an event for publishing to the broker.
     * @param event - The event wrapper to enqueue.
     * @example
     * sdk.sendEvent(myEvent);
     */
    public sendEvent(event: StellaNowEventWrapper): void {
        this.source.enqueue(event);
        this.logger.debug(`Event enqueued: ${event.value.metadata.messageId}`);
    }

    /**
     * Wraps and enqueues a message for publishing to the broker.
     * @param message - The base message to be wrapped and sent.
     * @example
     * sdk.SendMessage(myMessage);
     */
    public sendMessage(message: StellaNowMessageBase): void {
        const wrappedMessage = StellaNowMessageWrapper.fromMessage(message);
        const userDetailsEvent = StellaNowEventWrapper.fromWrapper(
            this.projectInfo,
            wrappedMessage
        );
        this.sendEvent(userDetailsEvent);
    }

    /**
     * Executes the event loop to process and publish queued messages.
     * @returns {Promise<void>} A promise that resolves when the loop completes its current cycle.
     * @throws {Error} If publishing fails, requeued events are handled internally.
     * @private
     */
    private async eventLoop(): Promise<void> {
        this.logger.debug('Running event loop');

        // Check connection state instead of CanPublish
        if (!this.sink.IsConnected) {
            this.logger.warn('Unable to publish: Sink is not connected');
            return;
        }

        if (this.source.isEmpty()) {
            this.logger.debug('No queued messages to publish');
            return;
        }

        this.logger.debug('Publishing queued messages');

        while (!this.source.isEmpty()) {
            const event = this.source.tryDequeue();

            if (event) {
                try {
                    this.logger.debug(`Publishing event: ${event.value.metadata.messageId}`);
                    await this.sink.sendMessageAsync(event);
                    this.logger.debug(`Event ${event.value.metadata.messageId} published successfully`);
                } catch (err) {
                    this.logger.error(`Failed to publish event ${event.value.metadata.messageId}: ${String(err)}`);
                    this.source.enqueue(event); // Requeue on failure
                }
            }
        }
    }

    /**
     * Creates a configured instance of StellaNowSDK with MQTT and OIDC authentication.
     * @remarks This factory method simplifies SDK setup by retrieving environment-based configurations,
     * setting up OIDC authentication via `OidcMqttAuthStrategy`, and initializing an MQTT sink with
     * `StellaNowMqttSink`. It uses a default in-memory `FifoQueue` for message queuing unless a custom
     * message source is provided. The method handles exceptions for invalid or missing configurations.
     * @param logger - The logger instance to use for logging events and errors (required).
     * @param projectInfo - The project information (defaults to environment-based configuration via `ProjectInfo.createFromEnv()`).
     * @param credentials - The credentials for OIDC authentication (defaults to environment-based configuration via `Credentials.createFromEnv()`).
     * @param envConfig - The environment configuration (defaults to SaaS production settings via `EnvConfig.saasProd()`).
     * @param messageSource - The message source for queuing events (defaults to a new `FifoQueue` instance).
     * @returns {Promise<StellaNowSDK>} A configured StellaNowSDK instance ready for use.
     * @throws {MissingEnvVariableError} If required environment variables (API_KEY, API_SECRET, ORGANIZATION_ID, PROJECT_ID) are not set.
     * @throws {InvalidUuidError} If ORGANIZATION_ID or PROJECT_ID environment variables are not valid UUIDs.
     * @throws {InvalidArgumentError} If any required parameter (e.g., logger) is null or invalid.
     * @throws {SinkInitializationError} If the MQTT sink initialization fails due to invalid parameters or state.
     * @throws {OidcAuthenticationError} If OIDC authentication fails during setup.
     * @example
     * const sdk = await StellaNowSDK.createWithMqttAndOidc(new DefaultLogger());
     * await sdk.start();
     * @example
     * const customLogger = new CustomLogger();
     * const customProjectInfo = ProjectInfo.create('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');
     * const sdk = await StellaNowSDK.createWithMqttAndOidc(customLogger, customProjectInfo);
     */
    public static async createWithMqttAndOidc(
        logger: ILogger,
        projectInfo: StellaNowProjectInfo = ProjectInfo.createFromEnv(),
        credentials: StellaNowCredentials = Credentials.createFromEnv(),
        envConfig: StellaNowEnvironmentConfig = EnvConfig.saasProd(),
        messageSource: IStellaNowMessageSource = new FifoQueue()
    ): Promise<StellaNowSDK> {
        try {
            logger.info('Creating StellaNowSDK instance with MQTT and OIDC authentication');
            const authStrategy = new OidcMqttAuthStrategy(logger, envConfig, projectInfo, credentials);
            const mqttSink = new StellaNowMqttSink(logger, authStrategy, projectInfo, envConfig);
            const sdk = new StellaNowSDK(projectInfo, mqttSink, messageSource, logger);

            return Promise.resolve(sdk);
        } catch (err: unknown) {
            logger.error('Failed to create StellaNowSDK:', String(err));
            return Promise.reject(new SdkCreationError(String(err), err));
        }
    }
}



export { StellaNowSDK };