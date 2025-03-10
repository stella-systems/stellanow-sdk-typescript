# StellaNowSDK
## Introduction
Welcome to the StellaNow Typescript SDK. This SDK is designed to provide an easy-to-use interface for developers integrating their NodeJS Typescript applications with the StellaNow Platform. The SDK communicates with the StellaNow Platform using the MQTT protocol over secure WebSockets.

## Key Features
* Automated connection handling (connection, disconnection and reconnection)
* Message queuing to handle any network instability
* Authentication management (login and automatic token refreshing)
* Easy interface to send different types of messages
* Per-message callbacks for notification of successful message sending
* Extensibility options for more specific needs

## Getting Started
Before you start integrating the SDK, ensure you have a Stella Now account.

## Installation
You can install the StellaNow SDK using npm:

__ Coming Soon __


## Configuration
The SDK supports multiple authentication strategies when connecting to the Stella Now MQTT Sink. You can configure the SDK using OIDC authentication or No authentication, depending on your environment.

### Setting Up StellaNow SDK
To use the SDK, first, ensure you have set the necessary environment variables:
* API_KEY
* API_SECRET
* ORGANIZATION_ID
* PROJECT_ID

* Then, register the SDK with the appropriate authentication strategy.

### Using OIDC Authentication

To authenticate with `StellaNow's` OIDC (OpenID Connect), use `AddStellaNowSdkWithMqttAndOidcAuth`:

```typescript

const stellaProjectInfo = ProjectInfoFromEnv();
const stellaCredentials = CredentialsFromEnv();
const stellaEnvConfig = EnvConfig.saasProd();

const stellaAuthService = new StellaNowAuthenticationService(
  logger,
  stellaEnvConfig,
  stellaProjectInfo,
  stellaCredentials,
);

var stellaMQttSink = new StellaNowMqttSink(
  stellaCredentials,
  stellaProjectInfo,
  stellaEnvConfig,
  stellaAuthService,
  logger,
);

```

This will:
* Authenticate with OIDC using the provided username and password, using a specific OIDC Client designed for data ingestion.
* Resulting token will be used in MQTT broker authentication with specific claim.
* Connect to the MQTT sink securely.


## Sample Application
Here is a simple application that uses StellaNowSDK to send user login messages to the Stella Now platform.

This function is the main entry point for our demonstration.
The `RunAsync` function does a few things:

* It establishes a connection to StellaNow.
* It creates 2 different messages and sends them using the StellaNow SDK.

```typescript
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
  StellaNowMqttSink,
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

var stellaMQttSink = new StellaNowMqttSink(
  stellaCredentials,
  stellaProjectInfo,
  stellaEnvConfig,
  stellaAuthService,
  logger,
);

var stellaSDK = new StellaNowSDK(
  stellaProjectInfo,
  stellaMQttSink,
  new FifoQueue(),
  logger,
);

console.log("Starting service up");

stellaSDK.OnError.subscribe((err) => {
  console.log("Error with stella service: " + err);
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
    '{"game_id": 123}',
  );

  stellaSDK.SendMessage(userDetailsMessage);
  stellaSDK.SendMessage(jsonMessage);
});

stellaSDK.Start();


```

This is the callback function that gets called when a message is successfully sent.
The `OnMessageSentAction` function logs the information that a message was sent successfully, along with the message's ID.

```csharp
private void OnMessageSentAction(StellaNowEventWrapper message)
{
    _logger.LogInformation(
        "Send Confirmation: {MessagesId}",
        message.Value.Metadata.MessageId
    );
}
```

The full code for sample applications can be found here: 

* [Basic Application](StellaNowDemo/src/main.ts)

### IMPORTANT

## Message Formatting
Messages in StellaNowSDK are wrapped in a `StellaNowMessageWrapper` and each specific message type extends this class to define its own properties. Each message needs to follow a certain format, including a type, list of entities, and optional fields. Here is an example:

```typescript
class UserLoginMessage extends StellaNowMessageBase implements ToJSON {
  constructor(
    public readonly patron_id: string,
    public readonly user_id: string,
    public readonly timestamp: string,
    public readonly user_group_id: string,
  ) {
    super("user_login", [new EntityType("patron_id", patron_id)]);
  }

  public toJSON(): any {
    return {
      user_id: Convertors.Convert(this.user_id),
      timestamp: Convertors.Convert(this.timestamp),
      user_group_id: Convertors.Convert(this.user_group_id),

      ...super.toJSON(),
    };
  }
}

```

Creating these classes by hand can be prone to errors. Therefore, we provide a command line interface (CLI) tool, **StellaNow CLI**, to automate this task. This tool generates the code for the message classes automatically based on the configuration defined in the Operators Console.

You can install **StellaNow CLI** tool using pip, which is a package installer for Python. It is hosted on Python Package Index (PyPI), a repository of software for the Python programming language. To install it, open your terminal and run the following command:

```bash
pip install stellanow-cli
```

Once you have installed the **StellaNow CLI** tool, you can use it to generate message classes. Detailed instructions on how to use the **StellaNow CLI** tool can be found in the tool's documentation.

Please note that it is discouraged to write these classes yourself. Using the CLI tool ensures that the message format aligns with the configuration defined in the Operators Console and reduces the potential for errors.

## Customization

StellaNowSDK provides extensive flexibility for developers to adapt the SDK to their specific needs. You can extend key components, including message queuing strategies, sinks (where messages are sent), connection strategies, and authentication mechanisms.

### Customizing the Message Queue Strategy
By default, `StellaNowSDK` uses an in-memory queue to temporarily hold messages before sending them to a sink. These non-persistent queues will lose all messages if the application terminates unexpectedly.

If your application requires a persistent queue that survives restarts or crashes, you can implement a custom queue strategy by extending `IMessageQueueStrategy` and integrating it with a database, file system, or distributed queue.

#### Using a Custom Queue Strategy

The demo uses an in memory FIFO queue, but you can instantiate and pass the StellaSDK
any class implementing the IStellaNowMessageQueue interface.

>⚠️ **Performance Considerations:** Persistent queues introduce additional latency and require careful design to balance reliability and performance.

#### Adding a Custom Sink
A sink is where messages are ultimately delivered. StellaNowSDK supports MQTT-based sinks, but you can extend this to support Kafka, Webhooks, Databases, or any custom integration.

## Support
For any issues or feature requests, feel free to create a new issue on our GitHub repository. If you need further assistance, contact our support team at help@stella.systems.

## Documentation
Detailed documentation will be available soon.

## License
This project is licensed under the terms of the MIT license.