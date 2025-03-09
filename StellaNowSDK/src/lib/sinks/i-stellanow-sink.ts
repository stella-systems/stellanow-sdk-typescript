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

import type { EventKey, StellaNowEventWrapper } from '../core/events.js';
import type { StellaNowSignal } from '../core/stellanow-signal.js';

/**
 * Interface for sinks that handle message publishing to external brokers.
 */
interface IStellaNowSink {
    /**
     * Gets a value indicating whether the sink is currently connected to the broker.
     */
    readonly IsConnected: boolean;

    /**
     * Event triggered when the sink successfully connects to the broker.
     */
    OnConnected: StellaNowSignal<() => void>;

    /**
     * Event triggered when the sink disconnects from the broker.
     */
    OnDisconnected: StellaNowSignal<() => void>;

    /**
     * Event triggered when broker acknowledges reciept of the event
     * @param eventKey The event key of the event.
     */
    OnMessageAck: StellaNowSignal<(eventKey: EventKey) => void>;

    /**
     * Event triggered when an error occurs in the sink.
     * @param message The error message.
     */
    OnError: StellaNowSignal<(message: string) => void>;

    /**
     * Starts the sink, initiating the connection to the broker.
     * @throws {Error} If the sink is already started or in an invalid state.
     */
    Start(): Promise<void>;

    /**
     * Stops the sink, terminating the connection to the broker.
     * @throws {Error} If the sink is not started or has been disposed.
     */
    Stop(): Promise<void>;

    /**
     * Sends a message to the broker asynchronously.
     * @param event The event wrapper containing the message to send.
     * @throws {Error} If the sink is not connected or an error occurs during sending.
     */
    SendMessageAsync(event: StellaNowEventWrapper): Promise<void>;
}

export { IStellaNowSink };
