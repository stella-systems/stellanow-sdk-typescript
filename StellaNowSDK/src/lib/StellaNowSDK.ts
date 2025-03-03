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
import { ILogger } from "./types/ILogger.js";

import { StellaProjectInfo } from "./types/Credentials.js";

import { StellaNowSignal } from "./core/StellaNowSignal.js";
import { IStellaNowMessageQueue } from "./core/MessageQueue.js";

import { StellaNowEventWrapper } from "./core/Events.js";
import {
  StellaNowMessageBase,
  StellaNowMessageWrapper,
} from "./core/Messages.js";
import { IStellaNowSink } from "./sinks/IStellaNowSink.js";

// Metrics to collect?
// - Messages sent?
// - Errors detected?
// - Anything else?

class StellaNowSDK {
  public OnConnected: StellaNowSignal<() => void>;
  public OnDisconnected: StellaNowSignal<() => void>;
  public OnError: StellaNowSignal<(message: string) => void>;

  constructor(
    private projectInfo: StellaProjectInfo,
    private sink: IStellaNowSink,
    private queue: IStellaNowMessageQueue,
    private logger: ILogger,
  ) {
    this.OnConnected = sink.OnConnected;
    this.OnDisconnected = sink.OnDisconnected;
    this.OnError = sink.OnError;

    setInterval(() => {
      this.EventLoop();
    }, 2000);
  }

  public async Start(): Promise<void> {
    return this.sink.Start();
  }

  public Stop(): void {
    this.sink.Stop();
  }

  public SendEvent(event: StellaNowEventWrapper) {
    this.queue.Enqueue(event);
  }

  public SendMessage(message: StellaNowMessageBase) {
    var wrappedMessage = StellaNowMessageWrapper.fromMessage(message);
    var userDetailsEvent = StellaNowEventWrapper.fromWrapper(
      this.projectInfo,
      wrappedMessage,
    );

    this.SendEvent(userDetailsEvent);
  }

  private EventLoop(): void {
    //TODO: Before connected: unable to establish connection, incorrect credentials, conack? (establish failure)
    //TODO: After connected: network failure, active disconnect, other error cases (seems to keep on trucking when these happen)
    //TODO: Reconnect when token expires? (Are we disconnected?)

    this.logger.debug("Run event loop");

    if (this.sink.CanPublish() == false) {
      return;
    }

    if (this.queue.IsEmpty()) {
      this.logger.debug("No queued messages to publish");
      return;
    }

    this.logger.debug("Publish queued messages");

    while (this.queue.IsEmpty() == false) {
      var event = this.queue.TryDequeue();

      if (event) {
        this.logger.debug("Publishing event");
        this.sink.Publish(event);
      }
    }
  }
}

export { StellaNowSDK };
