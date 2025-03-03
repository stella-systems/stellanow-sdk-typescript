import mqtt, { ErrorWithReasonCode, MqttClient, Packet } from "mqtt";
import { ILogger } from "../types/ILogger.js";
import { StellaNowEventWrapper } from "../core/Events.js";
import {
  StellaNowCredentials,
  StellaProjectInfo,
} from "../types/Credentials.js";
import { StellaNowSignal } from "../core/StellaNowSignal.js";
import { StellaNowAuthenticationService } from "../core/Authentication/StellaNowAuthenticationService.js";
import { StellaNowEnvironmentConfig } from "../types/EnvConfig.js";
import { IStellaNowSink } from "./IStellaNowSink.js";

class StellaServiceSessionToken {
  public valid: boolean = true;
}

enum StellaServiceState {
  Disconnected, // We are not connected, default initial state
  Connecting, // We are going through the auth + connect process
  Connected, // Auth and MQTT connection success, message pump active and publishing messages
  Disconnecting, // We are draining our queue
}

class StellaNowMqttSink implements IStellaNowSink {
  public OnConnected: StellaNowSignal<() => void> = new StellaNowSignal<
    () => void
  >();
  public OnDisconnected: StellaNowSignal<() => void> = new StellaNowSignal<
    () => void
  >();
  public OnError: StellaNowSignal<(message: string) => void> =
    new StellaNowSignal<(message: string) => void>();

  private currentState: StellaServiceState = StellaServiceState.Disconnected;

  private mqttClient: MqttClient | null = null;
  private currentSession: StellaServiceSessionToken | null = null;

  constructor(
    private credentials: StellaNowCredentials,
    private projectInfo: StellaProjectInfo,
    private envConfig: StellaNowEnvironmentConfig,

    private authService: StellaNowAuthenticationService,
    private logger: ILogger,
  ) {}

  public CanPublish(): boolean {
    return this.mqttClient != null;
  }

  public Publish(event: StellaNowEventWrapper): void {
    if (this.mqttClient === null) {
      // Maybe log a warning?
      return;
    }

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

  private ResetConnection(): void {
    if (this.currentSession != null) {
      this.currentSession.valid = false;
    }

    if (this.mqttClient != null) {
      this.mqttClient.end();
    }

    this.mqttClient = null;
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
    } catch (error) {
      this.logger.error("Unable to authenticate with API");
      this.ResetConnection();
      this.OnError.trigger("Unable to authenticate with API");
    }

    try {
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

      this.currentState = StellaServiceState.Connected;

      this.OnConnected.trigger();
    } catch {
      this.logger.error("Error triggered during MQTT connection");
      this.ResetConnection();
      // TODO: Also pass in caught error
      this.OnError.trigger("Error triggered during MQTT connection");
    }
  }
}

export { StellaNowMqttSink };
