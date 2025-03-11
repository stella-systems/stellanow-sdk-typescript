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

import type { StellaNowEventWrapper } from './events.ts';

/**
 * Interface representing a message source for the StellaNow SDK.
 * Responsible for managing the message queue and in-flight messages.
 */
interface IStellaNowMessageSource {
    /**
     * Enqueues a message into the queue.
     * @param event - The StellaNow event to enqueue.
     * @returns True if the message was enqueued successfully.
     */
    enqueue(event: StellaNowEventWrapper): boolean;

    /**
     * Re-enqueues all messages that are currently in-flight.
     */
    reEnqueueAll(): void;

    /**
     * Marks a message as acknowledged.
     * @param eventId - The unique identifier of the message to acknowledge.
     */
    markMessageAck(eventId: string): void;

    /**
     * Attempts to dequeue a message from the queue.
     * @returns The dequeued message, or undefined if the queue is empty.
     */
    tryDequeue(): StellaNowEventWrapper | undefined;

    /**
     * Checks if the message queue is empty.
     * @returns True if there are no messages in the queue.
     */
    isEmpty(): boolean;

    /**
     * Retrieves the number of messages currently in-flight.
     * @returns The count of in-flight messages.
     */
    numberInFlight(): number;

    /**
     * Retrieves the total number of messages in the queue.
     * @returns The length of the message queue.
     */
    length(): number;
}

/**
 * A First-In-First-Out (FIFO) queue implementation of the IStellaNowMessageSource.
 * This class manages messages in a queue and tracks those that are in-flight.
 */
class FifoQueue implements IStellaNowMessageSource {
    private items: StellaNowEventWrapper[] = [];
    private inFlight: Map<string, StellaNowEventWrapper> = new Map<string, StellaNowEventWrapper>();

    /**
     * Marks a message as acknowledged, removing it from the in-flight tracking.
     * @param eventId - The unique identifier of the message to acknowledge.
     */
    markMessageAck(eventId: string): void {
        this.inFlight.delete(eventId);
    }

    /**
     * Re-enqueues all messages currently marked as in-flight back into the queue.
     */
    reEnqueueAll(): void {
        this.inFlight.forEach(event => {
            this.enqueue(event);
        });
        this.inFlight.clear();
    }

    /**
     * Enqueues a message to the queue.
     * @param event - The message event to enqueue.
     * @returns True, indicating the message was enqueued.
     */
    enqueue(event: StellaNowEventWrapper): boolean {
        this.items.push(event);
        return true;
    }

    /**
     * Attempts to dequeue a message from the queue.
     * If a message is dequeued, it is added to the in-flight tracking.
     * @returns The dequeued message, or undefined if the queue is empty.
     */
    tryDequeue(): StellaNowEventWrapper | undefined {
        const item = this.items.shift();
        if (item) {
            this.inFlight.set(item.MessageId, item);
        }
        return item;
    }

    /**
     * Checks whether the message queue is empty.
     * @returns True if there are no messages in the queue.
     */
    isEmpty(): boolean {
        return this.items.length === 0;
    }

    /**
     * Retrieves the number of messages currently in-flight.
     * @returns The count of in-flight messages.
     */
    numberInFlight(): number {
        return this.inFlight.size;
    }

    /**
     * Retrieves the total number of messages in the queue.
     * @returns The number of messages waiting in the queue.
     */
    length(): number {
        return this.items.length;
    }
}

export { IStellaNowMessageSource, FifoQueue };
