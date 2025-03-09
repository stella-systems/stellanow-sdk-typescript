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

import type { MqttClient } from 'mqtt';

/**
 * Interface for authentication strategies used to connect an MQTT client.
 */
interface IMqttAuthStrategy {
    /**
     * Authenticates and returns a connected MQTT client.
     * @param brokerUrl The URL of the MQTT broker.
     * @param clientId The unique client ID for the MQTT session.
     * @returns A connected MqttClient instance.
     * @throws {Error} If authentication or connection fails.
     */
    getAuthenticatedClient(brokerUrl: string, clientId: string): Promise<MqttClient>;

    /**
     * Reconnects the existing MQTT client if it is disconnected.
     * @returns A promise that resolves when the client is reconnected.
     * @throws {Error} If reconnection fails.
     */
    reconnect(): Promise<void>;
}

export { IMqttAuthStrategy };