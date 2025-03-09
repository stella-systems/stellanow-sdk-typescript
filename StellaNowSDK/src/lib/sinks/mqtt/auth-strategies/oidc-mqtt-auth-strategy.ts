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

import type { MqttClient, IClientOptions } from 'mqtt';
import type {
    Configuration as DiscoveryConfig,
    TokenEndpointResponse,
    TokenEndpointResponseHelpers,
} from 'openid-client';
import {
    discovery,
    genericGrantRequest,
    refreshTokenGrant
} from 'openid-client';

import type { IMqttAuthStrategy } from './i-mqtt-auth-strategy.js';
import type {
    StellaNowEnvironmentConfig,
    StellaNowCredentials,
    StellaProjectInfo,
    ILogger,
} from '../../../types/index.js';

type TokenSet = TokenEndpointResponse & TokenEndpointResponseHelpers;

// Extend MqttClient to include options using IClientOptions for type safety
interface ExtendedMqttClient extends MqttClient {
    options: Partial<IClientOptions>;
}

/**
 * OIDC-based authentication strategy for MQTT connections.
 * This strategy uses the OpenID Connect protocol to authenticate and obtain an access token,
 * which is then used for MQTT connections.
 */
class OidcMqttAuthStrategy implements IMqttAuthStrategy {
    private logger: ILogger;
    private projectInfo: StellaProjectInfo;
    private credentials: StellaNowCredentials;
    private envConfig: StellaNowEnvironmentConfig;
    private readonly discoveryDocumentUrl: string;
    private configInstance: DiscoveryConfig | null = null;
    private tokenResponse: TokenSet | null = null;

    /**
     * Initializes a new instance of the OidcMqttAuthStrategy.
     * @param logger The logger instance for logging authentication events.
     * @param envConfig The environment configuration containing authority details.
     * @param projectInfo The project information including organization and project IDs.
     * @param credentials The credentials for OIDC authentication.
     * @throws {Error} If any parameter is null or invalid.
     */
    constructor(
        logger: ILogger,
        envConfig: StellaNowEnvironmentConfig,
        projectInfo: StellaProjectInfo,
        credentials: StellaNowCredentials
    ) {
        if (!logger || !envConfig || !projectInfo || !credentials) {
            throw new Error('All constructor parameters must be non-null');
        }
        this.logger = logger;
        this.envConfig = envConfig;
        this.projectInfo = projectInfo;
        this.credentials = credentials;
        this.discoveryDocumentUrl = `${this.envConfig.authority}/realms/${this.projectInfo.organizationId}/.well-known/openid-configuration`;
    }

    /**
     * Reconnects the existing MQTT client if it is disconnected.
     * @returns A promise that resolves when the client is reconnected.
     * @throws {Error} If reconnection fails.
     */
    public async auth(mqttClient: ExtendedMqttClient): Promise<void> {
        if (!mqttClient) {
            throw new Error('No MQTT client available to reconnect');
        }

        if (mqttClient.connected) {
            return; // Already connected, no action needed
        }

        await this.authenticate(); // Re-authenticate to get a new token if needed
        const accessToken = this.getAccessToken();
        if (!accessToken) {
            throw new Error('No valid access token available for reconnection');
        }

        // Update options and reconnect
        mqttClient.options.username = accessToken; // Safe access with ExtendedMqttClient
        mqttClient.options.password = ''; // Reset password
    }

    /**
     * Attempts to authenticate using OIDC, refreshing tokens if possible, or performing a new login.
     * @returns {Promise<void>} Resolves when authentication is complete.
     * @throws {Error} If authentication fails.
     */
    private async authenticate(): Promise<void> {
        if (!(await this.refreshTokensAsync())) {
            await this.loginAsync();
        }
    }

    /**
     * Validates the token response and throws an error if invalid.
     * @param response The token response to validate, which can be null.
     * @returns {void}
     * @throws {Error} If the response is null or contains an error.
     */
    private validateTokenResponse(response: TokenSet | null): void {
        if (!response || response.error) {
            const errorMessage = this.getErrorMessage(response?.error);
            this.logger.error(`Failed to authenticate: ${errorMessage}`);
            this.tokenResponse = null;
            throw new Error('Failed to authenticate.');
        }
    }

    /**
     * Retrieves the discovery document configuration, caching the result.
     * @returns {Promise<DiscoveryConfig>} The discovery document configuration.
     * @throws {Error} If the discovery document cannot be retrieved.
     */
    private async getDiscoveryDocumentResponse(): Promise<DiscoveryConfig> {
        if (this.configInstance) {
            return this.configInstance;
        }

        this.logger.info(
            `No current config instance, requesting one from: ${this.discoveryDocumentUrl}`
        );
        try {
            this.configInstance = await discovery(
                new URL(this.discoveryDocumentUrl),
                this.credentials.oidcClient
            );
            return this.configInstance;
        } catch (err: unknown) {
            this.logger.error(`Error retrieving discovery document: ${this.getErrorMessage(err)}`);
            this.configInstance = null;
            throw new Error('Could not retrieve discovery document');
        }
    }

    /**
     * Performs a new OIDC login using the password grant type.
     * @returns {Promise<void>} Resolves when login is complete.
     * @throws {Error} If the login fails.
     */
    private async loginAsync(): Promise<void> {
        this.logger.info('Attempting to authenticate');

        const config = await this.getDiscoveryDocumentResponse();

        try {
            this.logger.info('Requesting generic grant');
            this.tokenResponse = await genericGrantRequest(
                config,
                'password',
                new URLSearchParams({
                    username: this.credentials.apiKey,
                    password: this.credentials.apiSecret,
                })
            );

            this.logger.info('Validating token response');
            this.validateTokenResponse(this.tokenResponse); // Removed non-null assertion
            this.logger.info('Authentication successful');
        } catch (err: unknown) {
            this.logger.error(`Authentication error: ${this.getErrorMessage(err)}`);
            throw err;
        }
    }

    /**
     * Attempts to refresh the existing access token.
     * @returns {Promise<boolean>} True if the refresh was successful, false otherwise.
     * @throws {Error} If an unexpected error occurs during refresh.
     */
    private async refreshTokensAsync(): Promise<boolean> {
        this.logger.info('Attempting token refresh');

        if (
            !this.tokenResponse ||
            this.tokenResponse.error ||
            !this.tokenResponse.refresh_token
        ) {
            return false;
        }

        const config = await this.getDiscoveryDocumentResponse();

        try {
            this.tokenResponse = await refreshTokenGrant(
                config,
                this.tokenResponse.refresh_token,
                new URLSearchParams()
            );

            this.validateTokenResponse(this.tokenResponse);
            this.logger.info('Token refresh successful');
            return true;
        } catch (err: unknown) {
            this.logger.error(`Token refresh error: ${this.getErrorMessage(err)}`);
            return false;
        }
    }

    /**
     * Gets the current access token.
     * @returns {string | undefined} The access token if available, undefined otherwise.
     */
    private getAccessToken(): string | undefined {
        return this.tokenResponse?.access_token;
    }

    /**
     * Extracts a message from an unknown error object.
     * @param err The unknown error object.
     * @returns {string} The error message or a default string if the message is unavailable.
     */
    private getErrorMessage(err: unknown): string {
        if (err instanceof Error) {
            return err.message;
        }
        return String(err) || 'Unknown error';
    }
}

export { OidcMqttAuthStrategy };