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

import { UserDetailsMessage } from "./messages/UserDetailsMessage.js";
import { PhoneNumberModel } from "./messages/models/PhoneNumber.js";

import {
  ProjectInfoFromEnv,
  CredentialsFromEnv,
  DefaultLogger,
  EnvConfig,
  StellaNowJsonMessage,
  StellaNowSDK,
  StellaNowMqttSink,
  FifoQueue,
  OidcMqttAuthStrategy
} from "stella-sdk-typescript";

async function main() {
  const stellaProjectInfo = ProjectInfoFromEnv();
  const stellaCredentials = CredentialsFromEnv();
  const stellaEnvConfig = EnvConfig.saasProd();

  console.log("API Base URL:", stellaEnvConfig.apiBaseUrl);
  console.log("Broker URL:", stellaEnvConfig.brokerUrl);

  const logger = new DefaultLogger();

  // Instantiate OidcMqttAuthStrategy directly
  const authStrategy = new OidcMqttAuthStrategy(
      logger,
      stellaEnvConfig,
      stellaProjectInfo,
      stellaCredentials,
  );

  const stellaMqttSink = new StellaNowMqttSink(
      logger,
      authStrategy,
      stellaProjectInfo,
      stellaEnvConfig,
  );

  const stellaSDK = new StellaNowSDK(
      stellaProjectInfo,
      stellaMqttSink,
      new FifoQueue(),
      logger,
  );

  console.log("Starting service up");

  stellaSDK.OnError.subscribe((err) => {
    console.log("Error with stella service:", err);
  });

  stellaSDK.OnDisconnected.subscribe(() => {
    console.log("Stella service disconnected");
  });

  stellaSDK.OnConnected.subscribe(() => {
    console.log("Stella service connected");
    // Messages will be handled by the SDK's event loop
  });

  try {
    await stellaSDK.Start();
    console.log("StellaNowSDK started successfully");

    // Enqueue messages after starting
    const userDetailsMessage = new UserDetailsMessage(
        "e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8",
        "d7db42f0-13ab-4c89-a7c8-fae73691d3ed",
        new PhoneNumberModel(44, 753594),
    );

    const jsonMessage = new StellaNowJsonMessage(
        "e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8",
        "d7db42f0-13ab-4c89-a7c8-fae73691d3ed",
        '{"game_id": 123}',
    );

    stellaSDK.SendMessage(userDetailsMessage);
    stellaSDK.SendMessage(jsonMessage);
  } catch (err) {
    console.error("Failed to start StellaNowSDK:", String(err));
    process.exit(1); // Exit on failure
  }

  // Keep the process running (e.g., for event loop)
  process.stdin.resume();
}

main().catch((err) => {
  console.error("Main process failed:", String(err));
  process.exit(1);
});