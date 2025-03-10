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
 * Reads the value of an environment variable from process.env.
 * @param name - The name of the environment variable to read.
 * @param missing - The default value to return if the environment variable is not found (optional).
 * @returns {string} The value of the environment variable or the default value/missing string.
 * @remarks If the environment variable is not found and no default is provided, logs an error and returns an empty string.
 * @example
 * const apiKey = readEnv('API_KEY', 'default-key');
 */
function readEnv(
    name: string,
    missing: string | undefined = undefined
): string {
    const value = process.env[name] || missing;
    if (value === undefined) {
        // TODO: Should use some logger that has been passed in
        // eslint-disable-next-line no-console
        console.error(
            'Cannot find the requested environment variable: ' + name
        );
        return '';
    }
    return value;
}

export { readEnv };
