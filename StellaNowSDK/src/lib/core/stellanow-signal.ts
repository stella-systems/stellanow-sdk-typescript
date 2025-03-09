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

class StellaNowSignal<T extends (...args: any[]) => void   = () => void> {
    private listeners: T[] = [];

    /**
     * Subscribe to the Signal.
     * @param listener The function to be called when the event is triggered.
     */
    public subscribe(listener: T): void {
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }

    /**
     * Unsubscribe from the signal.
     * @param listener The function to remove from the event.
     */
    public unsubscribe(listener: T): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Trigger the signal, calling all subscribed listeners.
     * @param args Arguments to pass to the listeners.
     */
    public trigger(...args: Parameters<T>): void {
        try {
            this.listeners.forEach(listener => listener(...args));
        } catch {
            // TODO: Log out an error?
        }
    }
}

export { StellaNowSignal };
