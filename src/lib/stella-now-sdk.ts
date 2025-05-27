import { CancellationToken } from './core/cancellation-token.ts';
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

    private eventLoopTask?: Promise<void>;
    private cancellationToken: CancellationToken;
    private readonly batchSize: number = 100; // Process up to 100 messages per cycle
    private readonly loopDelayMs: number = 50; // Delay between cycles

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

        this.cancellationToken = new CancellationToken();
    }

    /**
     * Starts the SDK by initiating the sink's connection to the broker and starting the event loop.
     * @returns {Promise<void>} A promise that resolves when the SDK is started.
     * @throws {Error} If the sink fails to start or is already running.
     */
    public async start(): Promise<void> {
        try {
            await this.sink.start();
            this.logger.info('StellaNowSDK started successfully');

            // Start the persistent event loop
            this.eventLoopTask = this.runEventLoop();
        } catch (err) {
            this.logger.error(`Failed to start StellaNowSDK: ${String(err)}`);
            throw err;
        }
    }

    /**
     * Stops the SDK by terminating the sink's connection to the broker and stopping the event loop.
     * @returns {Promise<void>} A promise that resolves when the SDK is stopped.
     * @throws {Error} If the sink fails to stop or is not running.
     */
    public async stop(): Promise<void> {
        try {
            // Signal cancellation to stop the event loop
            this.cancellationToken.cancel();

            // Wait for the event loop to finish
            if (this.eventLoopTask) {
                await this.eventLoopTask;
                this.eventLoopTask = undefined;
            }

            // Stop the sink
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
     */
    public sendEvent(event: StellaNowEventWrapper): void {
        this.source.enqueue(event);
        // this.logger.debug(`Event enqueued: ${event.value.metadata.messageId}`);
    }

    /**
     * Wraps and enqueues a message for publishing to the broker.
     * @param message - The base message to be wrapped and sent.
     */
    public sendMessage(message: StellaNowMessageBase): void {
        const wrappedMessage = StellaNowMessageWrapper.fromMessage(message);
        const userDetailsEvent = StellaNowEventWrapper.fromWrapper(
            this.projectInfo,
            wrappedMessage
        );
        this.sendEvent(userDetailsEvent);
    }

    public messagesInQueueCount(): number {
        return this.source.length();
    }

    public messagesInFlightCount(): number {
        return this.source.numberInFlight();
    }

    /**
     * Runs the event loop continuously until cancellation is requested.
     * @returns {Promise<void>} A promise that resolves when the loop is cancelled.
     * @private
     */
    private async runEventLoop(): Promise<void> {
        while (!this.cancellationToken.isCancelled) {
            try {
                await this.eventLoop();
            } catch (err) {
                this.logger.error(`Event loop iteration failed: ${String(err)}`);
            }

            // Add a small delay to prevent tight looping and allow other tasks to run
            await new Promise(resolve => setTimeout(resolve, this.loopDelayMs));
        }
    }

    /**
     * Executes a single iteration of the event loop to process and publish queued messages.
     * @returns {Promise<void>} A promise that resolves when the iteration completes.
     * @throws {Error} If publishing fails, requeued events are handled internally.
     * @private
     */
    private async eventLoop(): Promise<void> {
        if (!this.sink.IsConnected) {
            this.logger.warn('Unable to publish: Sink is not connected');
            return;
        }

        if (this.source.isEmpty()) {
            this.logger.debug('No queued messages to publish');
            return;
        }

        const batch: StellaNowEventWrapper[] = [];
        while (!this.source.isEmpty() && batch.length < this.batchSize) {
            const event = this.source.tryDequeue();
            if (event) batch.push(event);
        }

        if (batch.length > 0) {
            this.logger.debug(`Publishing ${batch.length} queued messages`);
            await Promise.all(
                batch.map(event =>
                    this.sink.sendMessageAsync(event)
                        .catch(err => {
                            this.logger.error(`Failed to publish event ${event.value.metadata.messageId}: ${String(err)}`);
                            this.source.enqueue(event);
                        })
                )
            );
        }
    }

    /**
     * Creates a configured instance of StellaNowSDK with MQTT and OIDC authentication.
     */
    public static async createWithMqttAndOidc(
        logger: ILogger,
        envConfig: StellaNowEnvironmentConfig = EnvConfig.saasProd(),
        messageSource: IStellaNowMessageSource = new FifoQueue(),
        projectInfo: StellaNowProjectInfo = ProjectInfo.createFromEnv(),
        credentials: StellaNowCredentials = Credentials.createFromEnv(),
        performanceMonitorOn: boolean = false
    ): Promise<StellaNowSDK> {
        try {
            logger.info('Creating StellaNowSDK instance with MQTT and OIDC authentication');
            const authStrategy = new OidcMqttAuthStrategy(logger, envConfig, projectInfo, credentials);
            const mqttSink = new StellaNowMqttSink(logger, authStrategy, projectInfo, envConfig, performanceMonitorOn);
            const sdk = new StellaNowSDK(projectInfo, mqttSink, messageSource, logger);

            return Promise.resolve(sdk);
        } catch (err: unknown) {
            logger.error('Failed to create StellaNowSDK:', String(err));
            return Promise.reject(new SdkCreationError(String(err), err));
        }
    }
}

export { StellaNowSDK };