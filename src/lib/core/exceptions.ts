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
 * Base error class for all StellaNow-specific errors.
 * @remarks Provides a foundation for custom error types with additional context like an error code.
 */
export class StellaNowError extends Error {
    /**
     * Creates a new instance of StellaNowError.
     * @param message - The error message.
     * @param code - An optional error code for categorization.
     */
    constructor(
        message: string,
        public readonly code?: string
    ) {
        super(message);
        this.name = 'StellaNowError';
    }
}

/**
 * Error thrown when a required environment variable is missing.
 * @remarks Includes the name of the missing environment variable for better debugging.
 */
export class MissingEnvVariableError extends StellaNowError {
    /**
     * Creates a new instance of MissingEnvVariableError.
     * @param variableName - The name of the missing environment variable.
     */
    constructor(variableName: string) {
        super(`Missing required environment variable: ${variableName}`, 'MISSING_ENV_VARIABLE');
        this.name = 'MissingEnvVariableError';
        this.variableName = variableName;
    }

    /**
     * The name of the missing environment variable.
     * @type {string}
     */
    public readonly variableName: string;
}

/**
 * Error thrown when a required argument is missing or invalid.
 * @remarks Includes the name of the invalid argument for better debugging.
 */
export class InvalidArgumentError extends StellaNowError {
    /**
     * Creates a new instance of InvalidArgumentError.
     * @param argumentName - The name of the invalid or missing argument.
     * @param reason - The reason the argument is invalid (e.g., "cannot be empty").
     */
    constructor(argumentName: string, reason: string = 'cannot be empty') {
        super(`Invalid argument '${argumentName}': ${reason}`, 'INVALID_ARGUMENT');
        this.name = 'InvalidArgumentError';
        this.argumentName = argumentName;
        this.reason = reason;
    }

    /**
     * The name of the invalid or missing argument.
     * @type {string}
     */
    public readonly argumentName: string;

    /**
     * The reason the argument is invalid.
     * @type {string}
     */
    public readonly reason: string;
}

/**
 * Error thrown when an unknown type is passed to a conversion method.
 * @remarks Includes details about the unsupported type for debugging.
 */
export class UnknownTypeError extends StellaNowError {
    constructor(type: string) {
        super(`Unknown type passed to convert: ${type}`, 'UNKNOWN_TYPE');
        this.name = 'UnknownTypeError';
    }
}

/**
 * Error thrown when an OIDC authentication process fails.
 * @remarks Includes details about the authentication failure for debugging.
 */
export class OidcAuthenticationError extends StellaNowError {
    constructor(message: string, cause?: unknown) {
        super(`OIDC authentication failed: ${message}`, 'OIDC_AUTHENTICATION_ERROR');
        this.name = 'OidcAuthenticationError';
        this.cause = cause;
    }

    /**
     * The underlying cause of the authentication failure, if any.
     * @type {unknown}
     */
    public readonly cause?: unknown;
}

/**
 * Error thrown when retrieving or processing the OpenID Connect discovery document fails.
 * @remarks Includes details about the discovery document failure for debugging.
 */
export class DiscoveryDocumentError extends StellaNowError {
    constructor(message: string, cause?: unknown) {
        super(`Discovery document error: ${message}`, 'DISCOVERY_DOCUMENT_ERROR');
        this.name = 'DiscoveryDocumentError';
        this.cause = cause;
    }

    /**
     * The underlying cause of the discovery document failure, if any.
     * @type {unknown}
     */
    public readonly cause?: unknown;
}

/**
 * Error thrown when validating an OIDC token response fails.
 * @remarks Includes details about the token validation failure for debugging.
 */
export class TokenValidationError extends StellaNowError {
    constructor(message: string, cause?: unknown) {
        super(`Token validation failed: ${message}`, 'TOKEN_VALIDATION_ERROR');
        this.name = 'TokenValidationError';
        this.cause = cause;
    }

    /**
     * The underlying cause of the token validation failure, if any.
     * @type {unknown}
     */
    public readonly cause?: unknown;
}

/**
 * Error thrown when initializing a sink fails.
 * @remarks Includes details about the initialization failure, such as invalid parameters or state issues.
 */
export class SinkInitializationError extends StellaNowError {
    constructor(message: string, cause?: unknown) {
        super(`Sink initialization failed: ${message}`, 'SINK_INITIALIZATION_ERROR');
        this.name = 'SinkInitializationError';
        this.cause = cause;
    }

    /**
     * The underlying cause of the initialization failure, if any.
     * @type {unknown}
     */
    public readonly cause?: unknown;
}

/**
 * Error thrown when an operation on a sink fails.
 * @remarks Includes details about the operation failure, such as publishing or stopping issues.
 */
export class SinkOperationError extends StellaNowError {
    constructor(message: string, cause?: unknown) {
        super(`Sink operation failed: ${message}`, 'SINK_OPERATION_ERROR');
        this.name = 'SinkOperationError';
        this.cause = cause;
    }

    /**
     * The underlying cause of the operation failure, if any.
     * @type {unknown}
     */
    public readonly cause?: unknown;
}

/**
 * A custom exception class for MQTT connection-related errors.
 * @remarks This exception is thrown when issues occur during MQTT connection attempts, disconnections,
 * or operations within the StellaNow MQTT sink. It includes an optional broker URL for additional context.
 * Extends the native `Error` class to maintain compatibility with standard error handling.
 */
export class MqttConnectionException extends Error {
    /**
     * Creates a new instance of MqttConnectionException.
     * @param message - The error message describing the connection issue.
     * @param brokerUrl - The URL of the MQTT broker involved (optional), included in the error message for debugging.
     * @example
     * throw new MqttConnectionException('Failed to connect', 'wss://broker.example.com');
     * // Output: "Failed to connect (Broker: wss://broker.example.com)"
     * @example
     * throw new MqttConnectionException('Connection lost');
     * // Output: "Connection lost"
     */
    constructor(message: string, brokerUrl?: string) {
        super(`${message}${brokerUrl ? ` (Broker: ${brokerUrl})` : ''}`);
        this.name = 'MqttConnectionException';
    }
}

/**
 * Error thrown when a UUID is invalid.
 * @remarks Includes the name of the invalid UUID argument for better debugging.
 */
export class InvalidUuidError extends StellaNowError {
    /**
     * Creates a new instance of InvalidUuidError.
     * @param argumentName - The name of the invalid UUID argument.
     * @param value - The invalid UUID value (optional, for context).
     */
    constructor(argumentName: string, value?: string) {
        super(
            `Invalid UUID for argument '${argumentName}': ${value || 'value does not match UUID format'}`,
            'INVALID_UUID'
        );
        this.name = 'InvalidUuidError';
        this.argumentName = argumentName;
        this.value = value;
    }

    /**
     * The name of the invalid UUID argument.
     * @type {string}
     */
    public readonly argumentName: string;

    /**
     * The invalid UUID value, if provided.
     * @type {string | undefined}
     */
    public readonly value?: string;
}

export class SdkCreationError extends StellaNowError {
    constructor(message: string, cause?: unknown) {
        super(`SDK creation failed: ${message}`, 'SDK_CREATION_ERROR');
        this.name = 'SdkCreationError';
        this.cause = cause;
    }

    public readonly cause?: unknown;
}