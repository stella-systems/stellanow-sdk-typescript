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
 * @remarks Defines a contract for implementing authentication logic to reconnect an MQTT client.
 * Implementations should handle authentication (e.g., using OIDC tokens), token validation, and
 * discovery document retrieval, managing reconnection attempts and throwing specific exceptions
 * when failures occur (e.g., invalid credentials, token validation issues, or discovery document errors).
 */
interface IMqttAuthStrategy {
    /**
     * Reconnects the existing MQTT client if it is disconnected.
     * @param mqttClient - The MQTT client instance to reconnect.
     * @returns A promise that resolves when the client is successfully reconnected.
     * @throws {OidcAuthenticationError} If reconnection fails due to authentication issues,
     * such as invalid tokens, missing credentials, or authentication service errors.
     * @throws {DiscoveryDocumentError} If the OpenID Connect discovery document cannot be retrieved,
     * typically due to network issues or an invalid discovery URL.
     * @throws {TokenValidationError} If the OIDC token response is invalid or contains errors,
     * such as an expired or malformed token.
     * @example
     * const authStrategy = new OidcMqttAuthStrategy(logger, envConfig, projectInfo, credentials);
     * await authStrategy.auth(mqttClient);
     */
    auth(mqttClient: MqttClient): Promise<void>;
}

export { IMqttAuthStrategy };