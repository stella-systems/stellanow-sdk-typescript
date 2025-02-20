import { UserDetailsMessage } from "./messages/UserDetailsMessage.js";
import { PhoneNumberModel } from "./messages/models/PhoneNumber.js";

import {
  ProjectInfoFromEnv,
  StellaNowMessageWrapper,
  StellaProjectInfo,
} from "stella-sdk-typescript";
import { StellaNowEventWrapper } from "stella-sdk-typescript";

import { CredentialsFromEnv } from "stella-sdk-typescript";
import { EnvConfig } from "stella-sdk-typescript";

var userDetailsMessage = new UserDetailsMessage(
  "e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8",
  "d7db42f0-13ab-4c89-a7c8-fae73691d3ed",
  new PhoneNumberModel(44, 753594),
);

var wrappedUserDetailsMessage =
  StellaNowMessageWrapper.fromMessage(userDetailsMessage);

var stellaTestProjectInfo = new StellaProjectInfo(
  "f9e6ab62-7db8-45ea-a11b-c6a5e0b60d19",
  "3e5a5812-8802-4d53-84cf-6c67a33e153a",
);
// var stellaTestCredentials = new StellaNowCredentials(
//   "api-key",
//   "api-secret",
//   "clientId",
//   StellaNowCredentials.DEFAULT_OIDC_CLIENT);

//TODO: How should we expose this?
var userDetailsEvent = StellaNowEventWrapper.fromWrapper(
  stellaTestProjectInfo,
  wrappedUserDetailsMessage,
);

console.log(JSON.stringify(userDetailsEvent, null, 2));

import { Signal } from "./signal.js";

// -------------------
// API TO IMPLEMENT
// -------------------
// Start
// Stop
// SendMessage

// Plug in logger interface
// Plug in Auth

// TODO: Need to run the authentication
import { StellaNowAuthenticationService } from "stella-sdk-typescript";
import { DefaultLogger } from "stella-sdk-typescript";

const logger = new DefaultLogger();

// TODO: Add a fromEnv option? Allows user to populate how they like

const stellaProjectInfo = ProjectInfoFromEnv();
const stellaCredentials = CredentialsFromEnv();
const stellaEnvConfig = EnvConfig.saasProd();

const stellaAuthService = new StellaNowAuthenticationService(
  logger,
  stellaEnvConfig,
  stellaProjectInfo,
  stellaCredentials,
);

console.log(stellaEnvConfig.apiBaseUrl);
console.log(stellaEnvConfig.brokerUrl);

import { MqttClient } from "mqtt";
import { ErrorWithReasonCode, Packet } from "mqtt";
import mqtt from "mqtt";

stellaAuthService
  .authenticate()
  .then(() => {
    console.log("Connecting to: " + stellaEnvConfig.brokerUrl);
    console.log("Client Id: '" + stellaCredentials.clientId + "'");

    const client: MqttClient = mqtt.connect(stellaEnvConfig.brokerUrl, {
      clientId: stellaCredentials.clientId,
      username: stellaAuthService.getAccessToken(),
      password: "",
      clean: true,
      protocolVersion: 5,
    });

    // Before connected: unable to establish connection, incorrect credentials, conack? (establish failure)
    // After connected: network failure, active disconnect, other error cases (seems to keep on trucking when these happen)

    client.on("connect", () => {
      console.log("Connected to MQTT broker!");
      setInterval(() => {
        // Publish a message
        client.publish(
          "in/" + stellaProjectInfo.organizationId,
          JSON.stringify(userDetailsEvent),
          { qos: 1 },
          (error?: Error | ErrorWithReasonCode, packet?: Packet) => {
            console.log("Publish callback response: ");
            console.log(error);
            console.log(packet);
          },
        );
      }, 2000);
    });

    client.on("disconnect", () => {
      console.log("SDK HANDLE DISCONNECTED");
    });

    // Handle errors
    client.on("error", (err) => {
      console.error("SDK HANDLE MQTT Error:", err);
    });
  })
  .catch(() => {
    console.log("SDK UNABLE TO AUTHENTICATE");
  });

// // Start WebSocket client
// const client = new WebSocketClient(env.brokerUrl);
