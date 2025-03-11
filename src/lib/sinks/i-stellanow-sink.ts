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

import type { StellaNowEventWrapper } from '../core/events.ts';
import type { StellaNowSignal } from '../core/stellanow-signal.ts';

/**
 * Interface for sinks that handle message publishing to external brokers.
 * @remarks Defines a contract for implementing sinks that manage connections to external brokers
 * (e.g., MQTT) and publish messages. Implementations should handle initialization, connection
 * lifecycle, and message sending, throwing specific exceptions for initialization issues,
 * operational failures, or broker-specific errors.
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
     * Event triggered when broker acknowledges receipt of the event.
     * @param eventId Unique identifier of the event (aka message_id).
     */
    OnMessageAck: StellaNowSignal<(eventId: string) => void>;

    /**
     * Event triggered when an error occurs in the sink.
     * @param message The error message describing the issue.
     */
    OnError: StellaNowSignal<(message: string) => void>;

    /**
     * Starts the sink, initiating the connection to the broker.
     * @returns A promise that resolves when the sink is successfully started.
     * @throws {SinkInitializationError} If the sink is already started or encounters an invalid state
     * during initialization (e.g., missing configuration).
     * @example
     * await sink.start();
     */
    start(): Promise<void>;

    /**
     * Stops the sink, terminating the connection to the broker.
     * @returns A promise that resolves when the sink is successfully stopped.
     * @throws {SinkOperationError} If the sink is not started, has been disposed, or encounters
     * an error during shutdown.
     * @example
     * await sink.stop();
     */
    stop(): Promise<void>;

    /**
     * Sends a message to the broker asynchronously.
     * @param event The event wrapper containing the message to send.
     * @returns A promise that resolves when the message is successfully sent.
     * @throws {MqttConnectionException} If the sink is not connected to the broker or encounters
     * an MQTT-specific connection issue.
     * @throws {SinkOperationError} If the event is null or an unexpected error occurs during sending.
     * @example
     * await sink.sendMessageAsync(myEvent);
     */
    sendMessageAsync(event: StellaNowEventWrapper): Promise<void>;

    /**
     * Cleans up resources used by the sink, including disconnecting from the broker
     * and stopping the connection monitor.
     * @remarks This method should be called manually when the sink is no longer needed
     * to free up resources and prevent memory leaks.
     * @throws {SinkOperationError} If an error occurs during resource cleanup (e.g., failed disconnection).
     * @example
     * sink.dispose();
     */
    dispose(): void;
}

export { IStellaNowSink };