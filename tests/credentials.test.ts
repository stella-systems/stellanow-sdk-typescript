// src/tests/credentials.test.ts

import { test, expect, beforeEach, afterEach, vi } from 'vitest';

import { Credentials } from '../src/index.ts';
import type { StellaNowCredentials } from '../src/index.ts';
import { InvalidArgumentError, MissingEnvVariableError } from '../src/lib/core/exceptions.ts';
import * as utilities from '../src/lib/core/utilities.ts';

// Mock setup will be configured in beforeEach
vi.mock('../src/lib/core/utilities.ts');

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    // Reset any state if needed
});

test('create should create credentials with valid inputs', () => {
    const mockApiKey = 'test-api-key';
    const mockApiSecret = 'test-api-secret';
    const mockSinkClientId = 'test-sink-client-id';
    const mockOidcClient = 'test-oidc-client';

    const credentials: StellaNowCredentials = Credentials.create(mockApiKey, mockApiSecret, mockSinkClientId, mockOidcClient);
    expect(credentials).toEqual({
        apiKey: mockApiKey,
        apiSecret: mockApiSecret,
        sinkClientId: mockSinkClientId,
        oidcClient: mockOidcClient
    });
});

test('create should create credentials with empty sinkClientId', () => {
    const mockApiKey = 'test-api-key';
    const mockApiSecret = 'test-api-secret';
    const mockSinkClientId = '';
    const mockOidcClient = 'test-oidc-client';

    const credentials: StellaNowCredentials = Credentials.create(mockApiKey, mockApiSecret, mockSinkClientId, mockOidcClient);
    expect(credentials).toEqual({
        apiKey: mockApiKey,
        apiSecret: mockApiSecret,
        sinkClientId: mockSinkClientId,
        oidcClient: mockOidcClient
    });
});

test('create should create credentials with default oidcClient when not provided', () => {
    const mockApiKey = 'test-api-key';
    const mockApiSecret = 'test-api-secret';
    const mockSinkClientId = 'test-sink-client-id';
    const defaultOidcClient = 'event-ingestor'; // Assuming DEFAULT_OIDC_CLIENT_ID is 'event-ingestor'

    const credentials: StellaNowCredentials = Credentials.create(mockApiKey, mockApiSecret, mockSinkClientId);
    expect(credentials).toEqual({
        apiKey: mockApiKey,
        apiSecret: mockApiSecret,
        sinkClientId: mockSinkClientId,
        oidcClient: defaultOidcClient
    });
});

test('create should throw InvalidArgumentError for empty apiKey', () => {
    expect(() => Credentials.create('', 'secret', 'client-id', 'oidc-client'))
        .toThrow(InvalidArgumentError);
    expect(() => Credentials.create('', 'secret', 'client-id', 'oidc-client'))
        .toThrow('Invalid argument \'apiKey\': cannot be empty');
});

test('create should throw InvalidArgumentError for empty apiSecret', () => {
    expect(() => Credentials.create('key', '', 'client-id', 'oidc-client'))
        .toThrow(InvalidArgumentError);
    expect(() => Credentials.create('key', '', 'client-id', 'oidc-client'))
        .toThrow('Invalid argument \'apiSecret\': cannot be empty');
});

test('createFromEnv should create credentials from environment variables with all values set', () => {
    const mockApiKey = 'test-api-key';
    const mockApiSecret = 'test-api-secret';
    const mockSinkClientId = 'test-sink-client-id';
    const mockOidcClient = 'test-oidc-client';

    vi.mocked(utilities.readEnv)
        .mockReturnValueOnce(mockApiKey) // OIDC_USERNAME
        .mockReturnValueOnce(mockApiSecret) // OIDC_PASSWORD
        .mockReturnValueOnce(mockSinkClientId) // SINK_CLIENT_ID
        .mockReturnValueOnce(mockOidcClient); // OIDC_CLIENT

    const credentials: StellaNowCredentials = Credentials.createFromEnv();
    expect(credentials).toEqual({
        apiKey: mockApiKey,
        apiSecret: mockApiSecret,
        sinkClientId: mockSinkClientId,
        oidcClient: mockOidcClient
    });
});

test('createFromEnv should create credentials with empty sinkClientId when SINK_CLIENT_ID is not set', () => {
    const mockApiKey = 'test-api-key';
    const mockApiSecret = 'test-api-secret';
    const mockOidcClient = 'test-oidc-client';

    vi.mocked(utilities.readEnv)
        .mockReturnValueOnce(mockApiKey) // OIDC_USERNAME
        .mockReturnValueOnce(mockApiSecret) // OIDC_PASSWORD
        .mockReturnValueOnce('') // SINK_CLIENT_ID
        .mockReturnValueOnce(mockOidcClient); // OIDC_CLIENT

    const credentials: StellaNowCredentials = Credentials.createFromEnv();
    expect(credentials).toEqual({
        apiKey: mockApiKey,
        apiSecret: mockApiSecret,
        sinkClientId: '',
        oidcClient: mockOidcClient
    });
});

test('createFromEnv should create credentials with default oidcClient when OIDC_CLIENT is not set', () => {
    const mockApiKey = 'test-api-key';
    const mockApiSecret = 'test-api-secret';
    const mockSinkClientId = 'test-sink-client-id';
    const defaultOidcClient = 'event-ingestor'; // Assuming DEFAULT_OIDC_CLIENT_ID is 'event-ingestor'

    vi.mocked(utilities.readEnv)
        .mockReturnValueOnce(mockApiKey) // OIDC_USERNAME
        .mockReturnValueOnce(mockApiSecret) // OIDC_PASSWORD
        .mockReturnValueOnce(mockSinkClientId); // SINK_CLIENT_ID

    const credentials: StellaNowCredentials = Credentials.createFromEnv();
    expect(credentials).toEqual({
        apiKey: mockApiKey,
        apiSecret: mockApiSecret,
        sinkClientId: mockSinkClientId,
        oidcClient: defaultOidcClient
    });
});

test('createFromEnv should throw MissingEnvVariableError for missing OIDC_USERNAME', () => {
    vi.mocked(utilities.readEnv)
        .mockReturnValueOnce('') // OIDC_USERNAME
        .mockReturnValueOnce('secret') // OIDC_PASSWORD
        .mockReturnValueOnce('client-id') // SINK_CLIENT_ID
        .mockReturnValueOnce('oidc-client'); // OIDC_CLIENT

    expect(() => Credentials.createFromEnv())
        .toThrow(MissingEnvVariableError);
    expect(() => Credentials.createFromEnv())
        .toThrow('Missing required environment variable: OIDC_USERNAME');
});

// test('createFromEnv should throw MissingEnvVariableError for missing OIDC_PASSWORD', () => {
//     vi.mocked(utilities.readEnv)
//         .mockReturnValueOnce('key') // OIDC_USERNAME
//         .mockReturnValueOnce('') // OIDC_PASSWORD
//         .mockReturnValueOnce('client-id') // SINK_CLIENT_ID
//         .mockReturnValueOnce('oidc-client'); // OIDC_CLIENT
//
//     expect(() => Credentials.createFromEnv())
//         .toThrow(MissingEnvVariableError);
//     expect(() => Credentials.createFromEnv())
//         .toThrow('Missing required environment variable: OIDC_PASSWORD');
// });