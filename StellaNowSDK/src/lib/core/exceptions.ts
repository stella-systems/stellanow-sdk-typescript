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