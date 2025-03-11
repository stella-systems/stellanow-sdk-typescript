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

import type { ILogger } from '../types/index.ts';

function formatTimestamp(date: Date): string {
    return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);
}

/**
* A default implementation of the ILogger interface that logs messages to the console.
* @remarks Includes a timestamp and log level in each message.
*/
export class DefaultLogger implements ILogger {
    /**
     * Logs a debug message to the console.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    debug(message: string, ...meta: unknown[]): void {
        const timestamp: string = formatTimestamp(new Date());
        // eslint-disable-next-line no-console
        console.debug(`[${timestamp}] DEBUG: ${message}`, ...meta);
    }

    /**
     * Logs an info message to the console.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    info(message: string, ...meta: unknown[]): void {
        const timestamp: string = formatTimestamp(new Date());
        // eslint-disable-next-line no-console
        console.info(`[${timestamp}] INFO: ${message}`, ...meta);
    }

    /**
     * Logs a warning message to the console.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    warn(message: string, ...meta: unknown[]): void {
        const timestamp: string = formatTimestamp(new Date());
        // eslint-disable-next-line no-console
        console.warn(`[${timestamp}] WARN: ${message}`, ...meta);
    }

    /**
     * Logs an error message to the console.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    error(message: string, ...meta: unknown[]): void {
        const timestamp: string = formatTimestamp(new Date());
        // eslint-disable-next-line no-console
        console.error(`[${timestamp}] ERROR: ${message}`, ...meta);
    }
}