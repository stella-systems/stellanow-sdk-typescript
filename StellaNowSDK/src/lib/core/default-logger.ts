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

import type { ILogger } from '../types/index.js';

function formatTimestamp(date: Date): string {
    // For example: "2025-02-17 21:58:25"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export class DefaultLogger implements ILogger {
    debug(message: string, ...meta: any[]) {
        const timestamp = formatTimestamp(new Date());
        console.debug(`[${timestamp}] debug: ${message}`, ...meta);
    }

    info(message: string, ...meta: any[]) {
        const timestamp = formatTimestamp(new Date());
        console.info(`[${timestamp}] info: ${message}`, ...meta);
    }

    warn(message: string, ...meta: any[]) {
        const timestamp = formatTimestamp(new Date());
        console.warn(`[${timestamp}] warn: ${message}`, ...meta);
    }

    error(message: string, ...meta: any[]) {
        const timestamp = formatTimestamp(new Date());
        console.error(`[${timestamp}] error: ${message}`, ...meta);
    }
}
