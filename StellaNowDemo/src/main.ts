import { UserDetailsMessage } from "./messages/UserDetailsMessage.js";
import { PhoneNumberModel } from "./messages/models/PhoneNumber.js";

import {
  ProjectInfoFromEnv,
  CredentialsFromEnv,
  DefaultLogger,
  EnvConfig,
  FifoQueue,
  StellaNowAuthenticationService,
  StellaNowJsonMessage,
  StellaNowSDK,
} from "stella-sdk-typescript";

const stellaProjectInfo = ProjectInfoFromEnv();
const stellaCredentials = CredentialsFromEnv();
const stellaEnvConfig = EnvConfig.saasProd();

console.log(stellaEnvConfig.apiBaseUrl);
console.log(stellaEnvConfig.brokerUrl);

const logger = new DefaultLogger();

const stellaAuthService = new StellaNowAuthenticationService(
  logger,
  stellaEnvConfig,
  stellaProjectInfo,
  stellaCredentials,
);

var stellaSDK = new StellaNowSDK(
  stellaCredentials,
  stellaProjectInfo,
  stellaEnvConfig,
  stellaAuthService,
  new FifoQueue(),
  logger,
);

console.log("Starting service up");

stellaSDK.OnError.subscribe(() => {
  console.log("Error with stella service");
});

stellaSDK.OnDisconnected.subscribe(() => {
  console.log("Stella service disconnected");
});

stellaSDK.OnConnected.subscribe(() => {
  console.log("Stella Service connected");

  var userDetailsMessage = new UserDetailsMessage(
    "e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8",
    "d7db42f0-13ab-4c89-a7c8-fae73691d3ed",
    new PhoneNumberModel(44, 753594),
  );

  var jsonMessage = new StellaNowJsonMessage(
    "e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8",
    "d7db42f0-13ab-4c89-a7c8-fae73691d3ed",
    "{'game_id': 123}",
  );

  stellaSDK.SendMessage(userDetailsMessage);
  stellaSDK.SendMessage(jsonMessage);
});

stellaSDK.Start();
