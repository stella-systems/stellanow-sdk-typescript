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

import {
  discovery,
  genericGrantRequest,
  refreshTokenGrant,
} from "openid-client";
import {
  ILogger,
  StellaNowEnvironmentConfig,
  StellaNowCredentials,
} from "../../types";

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  [key: string]: any;
}

export class StellaNowAuthenticationService {
  private logger: ILogger;
  private credentials: StellaNowCredentials;
  private envConfig: StellaNowEnvironmentConfig;
  private discoveryDocumentUrl: string;
  private configInstance: any | null = null;
  private tokenResponse: TokenResponse | null = null;

  constructor(
    logger: ILogger,
    envConfig: StellaNowEnvironmentConfig,
    credentials: StellaNowCredentials,
  ) {
    this.logger = logger;
    this.envConfig = envConfig;
    this.credentials = credentials;

    this.discoveryDocumentUrl = `${this.envConfig.authority}/realms/${this.credentials.organizationId}/.well-known/openid-configuration`;
  }

  // Attempts to refresh tokens first; if that fails, performs a new login.
  public async authenticate(): Promise<void> {
    if (!(await this.refreshTokensAsync())) {
      await this.loginAsync();
    }
  }

  // Simple validation that checks for an error in the token response.
  private validateTokenResponse(response: TokenResponse): void {
    if (!response || response.error) {
      this.logger.error(`Failed to authenticate: ${response?.error}`);
      this.tokenResponse = null;

      throw new Error("Failed to authenticate.");
    }
  }

  // Retrieve (and cache) the discovery document configuration.
  private async getDiscoveryDocumentResponse(): Promise<any> {
    if (this.configInstance) {
      return this.configInstance;
    }

    try {
      this.configInstance = await discovery(
        new URL(this.discoveryDocumentUrl),
        this.credentials.oidcClient
      );

      return this.configInstance;
    } catch (err: any) {
      this.logger.error(`Error retrieving discovery document: ${err.message}`);

      this.configInstance = null;

      throw new Error("Could not retrieve discovery document");
    }
  }

  private async loginAsync(): Promise<void> {
    this.logger.info("Attempting to authenticate");

    const config = await this.getDiscoveryDocumentResponse();

    try {
      this.tokenResponse = await genericGrantRequest(
        config,
        "password",
        new URLSearchParams({
          username: this.credentials.apiKey,
          password: this.credentials.apiSecret
        }),
      );

      this.validateTokenResponse(this.tokenResponse);

      this.logger.info("Authentication successful");
    } catch (err: any) {
      this.logger.error(`Authentication error: ${err.message}`);

      throw err;
    }
  }

  private async refreshTokensAsync(): Promise<boolean> {
    this.logger.info("Attempting token refresh");

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
        new URLSearchParams(),
      );

      this.validateTokenResponse(this.tokenResponse);
      this.logger.info("Token refresh successful");

      return true;
    } catch (err: any) {
      this.logger.error(`Token refresh error: ${err.message}`);

      return false;
    }
  }

  // Exposes the current access token.
  public getAccessToken(): string | undefined {
    return this.tokenResponse?.access_token;
  }
}
