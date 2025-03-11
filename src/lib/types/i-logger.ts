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
 * Interface defining the contract for logging functionality in the StellaNow SDK.
 * @remarks Implementations of this interface should provide methods to log messages at
 * different severity levels (debug, info, warn, error) with optional metadata.
 */
export interface ILogger {
    /**
     * Logs a debug message, typically used for detailed diagnostic information.
     * @param message - The message to log.
     * @param meta - Additional metadata to include with the log message.
     * @example
     * logger.debug('Processing request', { id: 123, user: 'alice' });
     */
    debug(message: string, ...meta: unknown[]): void;

    /**
     * Logs an info message, used for general informational messages.
     * @param message - The message to log.
     * @param meta - Additional metadata to include with the log message.
     * @example
     * logger.info('Service started', { port: 8080 });
     */
    info(message: string, ...meta: unknown[]): void;

    /**
     * Logs a warning message, indicating potential issues that do not prevent operation.
     * @param message - The message to log.
     * @param meta - Additional metadata to include with the log message.
     * @example
     * logger.warn('Configuration missing', { key: 'apiKey' });
     */
    warn(message: string, ...meta: unknown[]): void;

    /**
     * Logs an error message, indicating a failure or critical issue.
     * @param message - The message to log.
     * @param meta - Additional metadata to include with the log message.
     * @example
     * logger.error('Failed to connect', new Error('Connection timeout'));
     */
    error(message: string, ...meta: unknown[]): void;
}