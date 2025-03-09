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

import { StellaNowEventWrapper } from './core/events.js';
import type { IStellaNowMessageSource } from './core/message-source.js';
import type { StellaNowMessageBase } from './core/messages.js';
import { StellaNowMessageWrapper } from './core/messages.js';
import type { StellaNowSignal } from './core/stellanow-signal.js';
import type { IStellaNowSink } from './sinks/i-stellanow-sink.js';
import type { StellaProjectInfo } from './types/credentials.js';
import type { ILogger } from './types/i-logger.js';

class StellaNowSDK {
    public readonly OnConnected: StellaNowSignal<() => void>;
    public readonly OnDisconnected: StellaNowSignal<() => void>;
    public readonly OnError: StellaNowSignal<(message: string) => void>;

    private messagesSent: number = 0;
    private errorsDetected: number = 0;

    constructor(
        private projectInfo: StellaProjectInfo,
        private sink: IStellaNowSink,
        private source: IStellaNowMessageSource,
        private logger: ILogger
    ) {
        this.OnConnected = sink.OnConnected;
        this.OnDisconnected = sink.OnDisconnected;
        this.OnError = sink.OnError;

        sink.OnMessageAck.subscribe(source.MarkMessageAck);

        setInterval(() => {
            this.eventLoop().catch((err) => {
                this.logger.error(`Event loop failed: ${String(err)}`);
                this.errorsDetected++;
            });
        }, 2000);
    }

    public async Start(): Promise<void> {
        try {
            await this.sink.Start();
            this.logger.info('StellaNowSDK started successfully');
        } catch (err) {
            this.logger.error(`Failed to start StellaNowSDK: ${String(err)}`);
            this.errorsDetected++;
            throw err;
        }
    }

    public async Stop(): Promise<void> {
        try {
            await this.sink.Stop();
            this.logger.info('StellaNowSDK stopped successfully');
        } catch (err) {
            this.logger.error(`Failed to stop StellaNowSDK: ${String(err)}`);
            this.errorsDetected++;
            throw err;
        }
    }

    public SendEvent(event: StellaNowEventWrapper): void {
        this.source.Enqueue(event);
        this.logger.debug(`Event enqueued: ${event.value.metadata.messageId}`);
    }

    public SendMessage(message: StellaNowMessageBase): void {
        const wrappedMessage = StellaNowMessageWrapper.fromMessage(message);
        const userDetailsEvent = StellaNowEventWrapper.fromWrapper(
            this.projectInfo,
            wrappedMessage
        );
        this.SendEvent(userDetailsEvent);
    }

    private async eventLoop(): Promise<void> {
        this.logger.debug('Running event loop');

        // Check connection state instead of CanPublish
        if (!this.sink.IsConnected) {
            this.logger.warn('Unable to publish: Sink is not connected');
            return;
        }

        if (this.source.IsEmpty()) {
            this.logger.debug('No queued messages to publish');
            return;
        }

        this.logger.debug('Publishing queued messages');

        while (!this.source.IsEmpty()) {
            const event = this.source.TryDequeue();

            if (event) {
                try {
                    this.logger.debug(`Publishing event: ${event.value.metadata.messageId}`);
                    await this.sink.SendMessageAsync(event);
                    this.messagesSent++;
                    this.logger.debug(`Event ${event.value.metadata.messageId} published successfully`);
                } catch (err) {
                    this.logger.error(`Failed to publish event ${event.value.metadata.messageId}: ${String(err)}`);
                    this.errorsDetected++;
                    this.source.Enqueue(event); // Requeue on failure
                }
            }
        }
    }

    /**
     * Gets the number of messages sent.
     * @returns {number} The total number of messages sent.
     */
    public getMessagesSent(): number {
        return this.messagesSent;
    }

    /**
     * Gets the number of errors detected.
     * @returns {number} The total number of errors detected.
     */
    public getErrorsDetected(): number {
        return this.errorsDetected;
    }
}

export { StellaNowSDK };