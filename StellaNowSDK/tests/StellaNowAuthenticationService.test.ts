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

import { discovery, genericGrantRequest, refreshTokenGrant, } from 'openid-client';
import { test, expect, beforeEach, afterEach, vi } from 'vitest';

import { StellaNowAuthenticationService } from '../src/lib/core/Authentication/stellanow-authentication-service.js';
import type {ILogger, StellaNowEnvironmentConfig} from '../src/lib/types/index.js';
import { StellaNowCredentials, StellaProjectInfo} from '../src/lib/types/index.js';

// 1) Mock the openid-client methods
vi.mock('openid-client', () => {
    return {
        discovery: vi.fn(),
        genericGrantRequest: vi.fn(),
        refreshTokenGrant: vi.fn(),
    };
});

// 2) Create a fake logger for testing
const mockLogger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// 3) Define some basic config/credentials
const mockEnvConfig: StellaNowEnvironmentConfig = {
    apiBaseUrl: 'https://api.example.com',
    brokerUrl: 'wss://broker.example.com',
    get authority() {
        return `${this.apiBaseUrl}/auth`;
    },
};

const mockInfo: StellaProjectInfo = new StellaProjectInfo(
    'myorg',
    'myproj'
);

const mockCredentials: StellaNowCredentials = new StellaNowCredentials(
    
    'username@example.com',
    'secret123',
    'myclient',
    StellaNowCredentials.DEFAULT_OIDC_CLIENT
);

let service: StellaNowAuthenticationService;

beforeEach(() => {
    vi.clearAllMocks();

    service = new StellaNowAuthenticationService(
        mockLogger,
        mockEnvConfig,
        mockInfo,
        mockCredentials
    );
});

afterEach(() => {
    // Reset any state if needed
});

// 4) Utility to cast the mocked functions for type safety
// @ts-ignore
const mockDiscovery = discovery as unknown as vi.Mock;
// @ts-ignore
const mockGenericGrant = genericGrantRequest as unknown as vi.Mock;
// @ts-ignore
const mockRefreshGrant = refreshTokenGrant as unknown as vi.Mock;

test('should login if refresh token is not available', async () => {
    // No existing token => refresh won't be called
    // so it must call login

    // Mock the discovery to succeed
    mockDiscovery.mockResolvedValueOnce({ token_endpoint: 'https://token.com' });
    // Mock the login (genericGrantRequest) to return a success token
    mockGenericGrant.mockResolvedValueOnce({
        access_token: 'ACCESS_TOKEN',
        refresh_token: 'REFRESH_TOKEN',
    });

    await service.authenticate();

    // Check that refresh was attempted => fails => login is done
    expect(mockRefreshGrant).not.toHaveBeenCalled(); // no existing token => won't refresh
    expect(mockGenericGrant).toHaveBeenCalledTimes(1); // did login
    expect(service.getAccessToken()).toBe('ACCESS_TOKEN');
    expect(mockLogger.info).toHaveBeenCalledWith('Authentication successful');
});

test('should refresh token if refresh token is present', async () => {
    // Set up an existing token with a refresh_token
    // so that refreshTokensAsync will be attempted
    // We'll simulate that the refresh is successful
    (service as any).tokenResponse = {
        access_token: 'OLD_ACCESS',
        refresh_token: 'OLD_REFRESH',
    };

    // Mock the discovery + refreshGrant success
    mockDiscovery.mockResolvedValueOnce({});
    mockRefreshGrant.mockResolvedValueOnce({
        access_token: 'NEW_ACCESS',
        refresh_token: 'NEW_REFRESH',
    });

    await service.authenticate();

    expect(mockRefreshGrant).toHaveBeenCalledTimes(1);
    expect(mockGenericGrant).not.toHaveBeenCalled(); // didn't need login
    expect(service.getAccessToken()).toBe('NEW_ACCESS');
    expect(mockLogger.info).toHaveBeenCalledWith('Token refresh successful');
});

test('should login if refresh fails', async () => {
    // We have a refresh token, but the refresh will fail => must fallback to login
    (service as any).tokenResponse = {
        access_token: 'OLD_ACCESS',
        refresh_token: 'OLD_REFRESH',
    };

    mockDiscovery.mockResolvedValue({});
    // Force the refresh to fail
    mockRefreshGrant.mockRejectedValueOnce(new Error('Refresh error'));
    // Then the login call returns success
    mockGenericGrant.mockResolvedValueOnce({
        access_token: 'LOGIN_ACCESS',
        refresh_token: 'LOGIN_REFRESH',
    });

    await service.authenticate();

    expect(mockRefreshGrant).toHaveBeenCalled();
    expect(mockGenericGrant).toHaveBeenCalled();
    expect(service.getAccessToken()).toBe('LOGIN_ACCESS');
    expect(mockLogger.info).toHaveBeenCalledWith('Authentication successful');
});

test('should throw if discovery fails', async () => {
    mockDiscovery.mockRejectedValueOnce(new Error('Discovery doc error'));

    await expect(service.authenticate()).rejects.toThrow('Could not retrieve discovery document');

    // No login or refresh attempt because discovery fails
    expect(mockGenericGrant).not.toHaveBeenCalled();
    expect(mockRefreshGrant).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving discovery document')
    );
});

test('should throw if token response has error', async () => {
    mockDiscovery.mockResolvedValueOnce({});
    // Return a tokenResponse with an error
    mockGenericGrant.mockResolvedValueOnce({
        error: 'invalid_grant',
    });

    await expect(service.authenticate()).rejects.toThrow('Failed to authenticate.');

    // Logged an error
    expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to authenticate: invalid_grant'
    );
    expect(service.getAccessToken()).toBeUndefined();
});