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

import type { StellaNowEventWrapper } from './events.ts';

interface IStellaNowMessageSource {
    // Returns false if the queue is full
    Enqueue(event: StellaNowEventWrapper): boolean;
    
    ReEnqueueAll(): void;

    MarkMessageAck(eventId: string): void;

    // Returns undefined if the queue is empty
    TryDequeue(): StellaNowEventWrapper | undefined;

    IsEmpty(): boolean;

    NumberInFlight() : number;
    Length(): number;
}

class FifoQueue implements IStellaNowMessageSource {
    private Items: StellaNowEventWrapper[] = [];
    private InFlight: Map<string, StellaNowEventWrapper> = new Map<string, StellaNowEventWrapper>();

    MarkMessageAck(eventId: string): void
    {
      this.InFlight.delete(eventId);
    }

    ReEnqueueAll(): void {
        this.InFlight.forEach(event => {
            this.Enqueue(event);
        });
        this.InFlight.clear();
    }

    Enqueue(event: StellaNowEventWrapper): boolean {
        this.Items.push(event);
        return true;
    }
    TryDequeue(): StellaNowEventWrapper | undefined {
        var item = this.Items.shift();
        if (item) {
            this.InFlight.set(item.MessageId, item);
        }

        return item;
    }

    IsEmpty(): boolean {
        return this.Items.length === 0;
    }
    
    NumberInFlight() : number {
        return this.InFlight.values.length;
    }

    Length(): number {
        return this.Items.length;
    }
}

export { IStellaNowMessageSource, FifoQueue };
