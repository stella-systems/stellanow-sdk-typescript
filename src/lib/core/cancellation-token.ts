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

/**
 * A simple cancellation token for controlling long-running operations.
 * Uses volatile-like pattern to ensure visibility across async operations.
 */
export class CancellationToken {
    private _isCancelled: boolean = false;
    private _cancelledAt: number = 0;

    /**
     * Gets whether the operation has been cancelled.
     */
    public get isCancelled(): boolean {
        // Reading both fields ensures memory barrier-like behavior
        return this._isCancelled || this._cancelledAt > 0;
    }

    /**
     * Signals cancellation of the operation.
     * This operation is idempotent and thread-safe for async contexts.
     */
    public cancel(): void {
        if (!this._isCancelled) {
            this._isCancelled = true;
            this._cancelledAt = Date.now();
        }
    }

    /**
     * Resets the cancellation token to non-cancelled state.
     * Use with caution - typically you should create a new token instead.
     */
    public reset(): void {
        this._isCancelled = false;
        this._cancelledAt = 0;
    }
}