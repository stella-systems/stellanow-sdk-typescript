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
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE OTHER DEALINGS IN
// THE SOFTWARE.

import pino from 'pino'; // Use default import
import type { Logger, TransportTargetOptions } from 'pino';
import type { ILogger } from 'stellanow-sdk';

const utcFormatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
});

function formatTimestamp(date: Date): string {
    return utcFormatter.format(date);
}

/**
 * Formats the log object with a custom timestamp and meta data.
 * @param logObject The log object to format.
 * @returns Formatted log object.
 */
function formatLog(logObject: Record<string, unknown>): Record<string, unknown> {
    const timestamp = formatTimestamp(new Date());
    const level = (logObject.level as string) || 'UNKNOWN';
    const message = logObject.msg as string || '';
    const meta = logObject.meta ? ` ${JSON.stringify(logObject.meta)}` : '';
    return {
        msg: `[${timestamp}] ${level}: ${message}${meta}`,
        level: undefined, // Remove level to avoid duplication in pino-pretty
        meta: undefined
    };
}

/**
 * An asynchronous logger implementation of the ILogger interface using Pino.
 * @remarks Logs messages asynchronously with a custom format, matching DefaultLogger's style.
 */
export class PinoLogger implements ILogger {
    private logger: Logger;

    /**
     * Initializes a new instance of the PinoLogger.
     * @param options - Optional Pino configuration (e.g., log level).
     */
    constructor(options: pino.LoggerOptions = {}) {
        const defaultOptions: pino.LoggerOptions = {
            level: 'debug', // Log all levels (debug, info, warn, error)
            formatters: {
                level: (label) => ({ level: label.toUpperCase() }), // Ensure level is uppercase
                log: formatLog // Apply custom formatting
            },
            messageKey: 'msg',
            // Use pino-pretty transport with a simple message format
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: false, // Handled by formatLog
                    ignore: 'pid,hostname,time', // Ignore default metadata
                    messageFormat: '{msg}' // Use the pre-formatted message
                }
            } as TransportTargetOptions
        };

        // Merge provided options with defaults
        const mergedOptions = { ...defaultOptions, ...options };

        // Create Pino logger with transport configuration
        this.logger = (pino as unknown as (options: pino.LoggerOptions) => Logger)(mergedOptions);
    }

    /**
     * Logs a debug message.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    debug(message: string, ...meta: unknown[]): void {
        this.logger.debug({ meta: meta.length ? meta : undefined }, message);
    }

    /**
     * Logs an info message.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    info(message: string, ...meta: unknown[]): void {
        this.logger.info({ meta: meta.length ? meta : undefined }, message);
    }

    /**
     * Logs a warning message.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    warn(message: string, ...meta: unknown[]): void {
        this.logger.warn({ meta: meta.length ? meta : undefined }, message);
    }

    /**
     * Logs an error message.
     * @param message - The message to log.
     * @param meta - Additional metadata to include in the log.
     */
    error(message: string, ...meta: unknown[]): void {
        this.logger.error({ meta: meta.length ? meta : undefined }, message);
    }
}