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

import { StellaNowAuthenticationService } from "./Authentication/StellaNowAuthenticationService.js";
import { ILogger } from "../types/ILogger.js";

import mqtt from "mqtt";
import { MqttClient } from "mqtt";
import { ErrorWithReasonCode, Packet } from "mqtt";

import { StellaNowEnvironmentConfig } from "../types/EnvConfig.js";
import {
  StellaNowCredentials,
  StellaProjectInfo,
} from "../types/Credentials.js";

import { StellaNowSignal } from "./StellaNowSignal.js";
import { IStellaNowMessageQueue } from "./MessageQueue.js";

import { StellaNowEventWrapper } from "./Events.js";
import { StellaNowMessageBase, StellaNowMessageWrapper } from "./Messages.js";

// Metrics to collect?
// - Messages sent?
// - Errors detected?
// - Anything else?
enum StellaServiceState {
  Disconnected, // We are not connected, default initial state
  Connecting, // We are going through the auth + connect process
  Connected, // Auth and MQTT connection success, message pump active and publishing messages
  Disconnecting, // We are draining our queue
}

class StellaServiceSessionToken {
  public valid: boolean = true;
}

class StellaNowSDK {
  private currentState: StellaServiceState = StellaServiceState.Disconnected;
  private messagePump: ReturnType<typeof setInterval> | null = null;
  private mqttClient: MqttClient | null = null;
  private currentSession: StellaServiceSessionToken | null = null;

  public OnConnected: StellaNowSignal<() => void> = new StellaNowSignal<
    () => void
  >();
  public OnDisconnected: StellaNowSignal<() => void> = new StellaNowSignal<
    () => void
  >();
  public OnError: StellaNowSignal<(message: string) => void> =
    new StellaNowSignal<(message: string) => void>();

  constructor(
    private credentials: StellaNowCredentials,
    private projectInfo: StellaProjectInfo,
    private envConfig: StellaNowEnvironmentConfig,
    private authService: StellaNowAuthenticationService,
    private queue: IStellaNowMessageQueue,
    private logger: ILogger,
  ) {}

  private ResetConnection(): void {
    if (this.currentSession != null) {
      this.currentSession.valid = false;
    }

    if (this.messagePump != null) {
      clearInterval(this.messagePump);
    }

    if (this.mqttClient != null) {
      this.mqttClient.end();
    }

    this.mqttClient = null;
    this.messagePump = null;
    this.currentSession = null;

    this.currentState = StellaServiceState.Disconnected;
  }

  private async StartNewConnection(): Promise<void> {
    var capturedSession = new StellaServiceSessionToken();

    this.currentSession = capturedSession;
    this.currentState = StellaServiceState.Connecting;

    try {
      await this.authService.authenticate();

      if (capturedSession.valid == false) {
        // Session was cancelled during connection
      }

      this.mqttClient = await mqtt.connectAsync(this.envConfig.brokerUrl, {
        clientId: this.credentials.clientId,
        username: this.authService.getAccessToken(),
        password: "",
        clean: true,
        protocolVersion: 5,
      });

      if (capturedSession.valid == false) {
        // Session was cancelled during connection - do not continue any further
        return;
      }

      this.mqttClient.on("disconnect", () => {
        console.log("SDK HANDLE DISCONNECTED");
        this.ResetConnection();
      });
      // Handle errors
      this.mqttClient.on("error", (err) => {
        console.error("SDK HANDLE MQTT Error:", err);
        this.ResetConnection();
      });

      this.logger.info("Connected to MQTT broker!");
      this.messagePump = setInterval(() => {
        this.EventLoop();
      }, 2000);
      this.currentState = StellaServiceState.Connected;

      this.OnConnected.trigger();
    } catch {
      this.logger.error("Unable to authenticate with API");
      this.ResetConnection();
      this.OnError.trigger("Unable to authenticate with API");
    }
  }

  public async Start(): Promise<void> {
    if (this.currentState != StellaServiceState.Disconnected) {
      this.logger.error("Error, trying to connect when in invalid state");
      throw "Error, trying to connect when in invalid state";
    }

    return this.StartNewConnection();
  }

  public Stop(): void {
    if (this.currentState == StellaServiceState.Connecting) {
      this.ResetConnection();
    }

    if (this.currentState == StellaServiceState.Connected) {
      this.currentState = StellaServiceState.Disconnecting;
    }
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

    if (
      this.currentState == StellaServiceState.Connected ||
      this.currentState == StellaServiceState.Disconnecting
    ) {
      while (this.queue.IsEmpty() == false) {
        var event = this.queue.TryDequeue();

        if (event && this.mqttClient) {
          this.mqttClient.publish(
            "in/" + this.projectInfo.organizationId,
            JSON.stringify(event),
            { qos: 1 },
            (error?: Error | ErrorWithReasonCode, packet?: Packet) => {
              if (error) {
                this.OnError.trigger(error.message);
              }
            },
          );
        }
      }
    }

    if (
      this.currentState == StellaServiceState.Disconnecting &&
      this.queue.IsEmpty()
    ) {
      // Disconnect requested and queue drained
      this.ResetConnection();
    }
  }
}

export { StellaNowSDK };
