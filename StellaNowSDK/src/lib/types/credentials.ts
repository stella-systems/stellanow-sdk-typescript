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

import { DEFAULT_OIDC_CLIENT_ID, OIDC_CREDENTIALS_ENV_VARS, SINK_ENV_VARS } from './constants.ts';
import { InvalidArgumentError, MissingEnvVariableError } from '../core/exceptions.ts';
import { readEnv } from '../core/utilities.ts';

/**
 * Interface representing credentials for authenticating with the StellaNow system.
 * @remarks Includes API key, API secret, client ID, and an OIDC client identifier.
 */
export interface StellaNowCredentials {
    apiKey: string;
    apiSecret: string;
    sinkClientId: string;
    oidcClient: string;
}

/**
 * Creates a StellaNowCredentials instance with the provided values.
 * @param apiKey - The API key for authentication.
 * @param apiSecret - The API secret for authentication.
 * @param sinkClientId - The sinks client ID for the application.
 * @param oidcClient - The OIDC client identifier (defaults to 'event-ingestor' if not provided).
 * @returns {StellaNowCredentials} A new StellaNowCredentials instance.
 * @throws {InvalidArgumentError} If required arguments (apiKey, apiSecret, clientId) are empty or not provided.
 * @example
 * const creds = create('key', 'secret', 'client', 'oidc');
 */
function create(apiKey: string, apiSecret: string, sinkClientId: string, oidcClient: string = DEFAULT_OIDC_CLIENT_ID): StellaNowCredentials {
    // Validate required arguments
    if (!apiKey) {
        throw new InvalidArgumentError('apiKey', 'cannot be empty');
    }
    if (!apiSecret) {
        throw new InvalidArgumentError('apiSecret', 'cannot be empty');
    }

    return { apiKey, apiSecret, sinkClientId, oidcClient };
}

export const Credentials = {
    create,

    /**
     * Creates a StellaNowCredentials instance using environment variables.
     * @returns {StellaNowCredentials} A new instance populated with OIDC_USERNAME, OIDC_PASSWORD, SINK_CLIENT_ID,
     * and OIDC_CLIENT (defaulting to 'event-ingestor' if not set) from the environment.
     * @throws {MissingEnvVariableError} If required environment variables (OIDC_USERNAME, OIDC_PASSWORD, SINK_CLIENT_ID) are not set.
     * @example
     * const credentials = Credentials.createFromEnv();
     */
    createFromEnv(): StellaNowCredentials {
        const apiKey = readEnv(OIDC_CREDENTIALS_ENV_VARS.USERNAME);
        const apiSecret = readEnv(OIDC_CREDENTIALS_ENV_VARS.PASSWORD);
        const sinkClientId = readEnv(SINK_ENV_VARS.SINK_CLIENT_ID);
        const oidcClient = readEnv(OIDC_CREDENTIALS_ENV_VARS.CLIENT, DEFAULT_OIDC_CLIENT_ID);

        // Validate environment variables before calling create
        if (!apiKey) {
            throw new MissingEnvVariableError(OIDC_CREDENTIALS_ENV_VARS.USERNAME);
        }
        if (!apiSecret) {
            throw new MissingEnvVariableError(OIDC_CREDENTIALS_ENV_VARS.PASSWORD);
        }

        return create(apiKey, apiSecret, sinkClientId, oidcClient);
    }
};