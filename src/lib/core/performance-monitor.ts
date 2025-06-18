// Copyright (C) 2025 Stella Technologies (UK) Limited.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

import type { ILogger } from '../types/i-logger.ts';

/**
 * A utility class for monitoring performance metrics, such as messages per second (MPS).
 * @remarks Tracks events over time and calculates rates, logging them periodically.
 */
export class PerformanceMonitor {
    private eventCount: number = 0;
    private lastLogTime: number = Date.now();
    private readonly logIntervalMs: number;

    /**
     * Initializes a new instance of the PerformanceMonitor.
     * @param logger - The logger instance for logging performance metrics.
     */
    constructor(
        private logger: ILogger,
    ) {
        this.logIntervalMs = 1000;
        // Start periodic logging of MPS
        setInterval(() => this.logMps(), this.logIntervalMs);
    }

    /**
     * Records an event (e.g., a message being sent) for performance tracking.
     */
    public recordEvent(): void {
        this.eventCount++;
    }

    /**
     * Calculates and logs the messages per second (MPS) rate.
     * @private
     */
    private logMps(): void {
        const currentTime = Date.now();
        const timeDiffSeconds = (currentTime - this.lastLogTime) / 1000;

        if (timeDiffSeconds > 0) {
            const mps = this.eventCount / timeDiffSeconds;
            this.logger.debug(`MPS: ${mps.toFixed(2)}`);
            this.eventCount = 0; // Reset counter
            this.lastLogTime = currentTime;
        }
    }
}