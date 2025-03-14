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
import { nanoid } from 'nanoid';
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
import {
    OidcAuthenticationError,
    DiscoveryDocumentError,
    TokenValidationError,
    InvalidArgumentError
} from '../../../core/exceptions.ts';
import { getErrorMessage } from '../../../core/utilities.ts';
import type {
    StellaNowEnvironmentConfig,
    StellaNowCredentials,
    StellaNowProjectInfo,
    ILogger,
} from '../../../types/index.ts';

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
    private projectInfo: StellaNowProjectInfo;
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
     * @throws {InvalidArgumentError} If any parameter is null or invalid.
     */
    constructor(
        logger: ILogger,
        envConfig: StellaNowEnvironmentConfig,
        projectInfo: StellaNowProjectInfo,
        credentials: StellaNowCredentials
    ) {
        if (!logger || !envConfig || !projectInfo || !credentials) {
            throw new InvalidArgumentError('constructor parameters', 'All constructor parameters must be non-null');
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
     * @throws {OidcAuthenticationError} If authentication or reconnection fails.
     */
    public async auth(mqttClient: ExtendedMqttClient): Promise<void> {
        if (!mqttClient) {
            throw new OidcAuthenticationError('No MQTT client available to reconnect');
        }

        if (mqttClient.connected) {
            return; // Already connected, no action needed
        }

        await this.authenticate(); // Re-authenticate to get a new token if needed
        const accessToken = this.getAccessToken();
        if (!accessToken) {
            throw new OidcAuthenticationError('No valid access token available for reconnection');
        }

        const clientId: string = this.credentials.sinkClientId ? this.credentials.sinkClientId : `StellaNowSdkTS-${nanoid(10)}`;

        this.logger.info(`MQTT clientId: ${clientId}`);

        // Update options and reconnect
        mqttClient.options.username = accessToken; // Safe access with ExtendedMqttClient
        mqttClient.options.password = ''; // Reset password
        mqttClient.options.clientId = clientId;
    }

    /**
     * Attempts to authenticate using OIDC, refreshing tokens if possible, or performing a new login.
     * @returns {Promise<void>} Resolves when authentication is complete.
     * @throws {OidcAuthenticationError} If authentication fails.
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
     * @throws {TokenValidationError} If the response is null or contains an error.
     */
    private validateTokenResponse(response: TokenSet | null): void {
        if (!response || response.error) {
            const errorMessage = getErrorMessage(response?.error);
            this.logger.error(`Failed to authenticate: ${errorMessage}`);
            this.tokenResponse = null;
            throw new TokenValidationError(`Invalid token response: ${errorMessage}`, response?.error);
        }
    }

    /**
     * Retrieves the discovery document configuration, caching the result.
     * @returns {Promise<DiscoveryConfig>} The discovery document configuration.
     * @throws {DiscoveryDocumentError} If the discovery document cannot be retrieved.
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
            this.logger.error(`Error retrieving discovery document: ${getErrorMessage(err)}`);
            this.configInstance = null;
            throw new DiscoveryDocumentError('Could not retrieve discovery document', err);
        }
    }

    /**
     * Performs a new OIDC login using the password grant type.
     * @returns {Promise<void>} Resolves when login is complete.
     * @throws {OidcAuthenticationError} If the login fails.
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
            this.logger.error(`Authentication error: ${getErrorMessage(err)}`);
            throw new OidcAuthenticationError('Login failed', err);
        }
    }

    /**
     * Attempts to refresh the existing access token.
     * @returns {Promise<boolean>} True if the refresh was successful, false otherwise.
     * @throws {OidcAuthenticationError} If an unexpected error occurs during refresh.
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
            this.logger.error(`Token refresh error: ${getErrorMessage(err)}`);
            throw new OidcAuthenticationError('Token refresh failed', err);
        }
    }

    /**
     * Gets the current access token.
     * @returns {string | undefined} The access token if available, undefined otherwise.
     */
    private getAccessToken(): string | undefined {
        return this.tokenResponse?.access_token;
    }
}

export { OidcMqttAuthStrategy };