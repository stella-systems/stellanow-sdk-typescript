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

/**
 * Interface representing the configuration for the StellaNow environment.
 * @remarks Contains the API base URL, broker URL, and a getter for the authority URL.
 */
export interface StellaNowEnvironmentConfig {
    /**
     * The base URL for the API endpoint.
     * @type {string}
     */
    apiBaseUrl: string;

    /**
     * The WebSocket URL for the broker.
     * @type {string}
     */
    brokerUrl: string;

    /**
     * Gets the authority URL derived from the API base URL.
     * @returns {string} The authority URL (e.g., 'https://api.prod.stella.cloud/auth').
     */
    get authority(): string;
}

/**
 * Creates a new StellaNowEnvironmentConfig instance with the specified base and broker URLs.
 * @param baseUrl - The base URL for the API endpoint.
 * @param brokerUrl - The URL for the broker.
 * @returns {StellaNowEnvironmentConfig} A new configuration object with the specified URLs and an authority getter.
 * @example
 * const config = createEnvConfig('https://api.custom.stella.cloud', 'wss://ingestor.custom.stella.cloud:8083/mqtt');
 */
function createEnvConfig(
    baseUrl: string,
    brokerUrl: string
): StellaNowEnvironmentConfig {
    return {
        apiBaseUrl: baseUrl,
        brokerUrl,
        get authority(): string {
            return `${this.apiBaseUrl}/auth`;
        },
    };
}

/**
 * Provides methods to create StellaNow environment configurations.
 * @remarks Includes predefined configurations for production and staging environments,
 * as well as a custom configuration creator.
 */
export const EnvConfig = {
    /**
     * Creates a StellaNowEnvironmentConfig instance for the production SaaS environment.
     * @returns {StellaNowEnvironmentConfig} A configuration object for the production environment.
     * @example
     * const prodConfig = EnvConfig.saasProd();
     */
    saasProd(): StellaNowEnvironmentConfig {
        return createEnvConfig(
            'https://api.prod.stella.cloud',
            'wss://ingestor.prod.stella.cloud:8083/mqtt'
        );
    },

    /**
     * Creates a StellaNowEnvironmentConfig instance for the staging SaaS environment.
     * @returns {StellaNowEnvironmentConfig} A configuration object for the staging environment.
     * @example
     * const stageConfig = EnvConfig.saasStage();
     */
    saasStage(): StellaNowEnvironmentConfig {
        return createEnvConfig(
            'https://api.stage.stella.cloud',
            'wss://ingestor.stage.stella.cloud:8083/mqtt'
        );
    },

        /**
     * Creates a StellaNowEnvironmentConfig instance for the staging SaaS environment.
     * @returns {StellaNowEnvironmentConfig} A configuration object for the staging environment.
     * @example
     * const stageConfig = EnvConfig.saasStage();
     */
        saasDev(): StellaNowEnvironmentConfig {
            return createEnvConfig(
                'https://api.dev.stella.cloud',
                'wss://ingestor.dev.stella.cloud:8083/mqtt'
            );
        },

    /**
     * Creates a custom StellaNowEnvironmentConfig instance with the specified base and broker URLs.
     * @param baseUrl - The base URL for the API endpoint.
     * @param brokerUrl - The URL for the broker.
     * @returns {StellaNowEnvironmentConfig} A configuration object with the specified URLs.
     * @example
     * const customConfig = EnvConfig.createCustomEnv('https://api.custom.stella.cloud', 'wss://ingestor.custom.stella.cloud:8083/mqtt');
     */
    createCustomEnv(
        baseUrl: string,
        brokerUrl: string
    ): StellaNowEnvironmentConfig {
        return createEnvConfig(baseUrl, brokerUrl);
    },
};