Thank you for providing the demo app code! I apologize for the inaccuracies in the previous README sample application. Upon reviewing the provided `main.ts` and related message files (`PhoneNumberModel.ts`, `UserLoginMessage.ts`, `UserDetailsMessage.ts`), I can see several discrepancies between the README's sample and the actual implementation. Let’s correct these issues by aligning the README's sample application and usage examples with the working demo app. I’ll also ensure consistency with the SDK’s current structure, including the use of `OidcMqttAuthStrategy` directly (as shown in your demo) and the updated message classes.

### Identified Issues in the Previous README Sample

1. **Authentication Service Misalignment**:
  - The README used `StellaNowAuthenticationService`, but your demo app uses `OidcMqttAuthStrategy` directly within `StellaNowMqttSink`. There’s no `StellaNowAuthenticationService` in the provided SDK code, suggesting it might be outdated or misnamed.

2. **Method Name Case**:
  - The README used `SendMessage`, but the demo uses `sendMessage` (camelCase, consistent with TypeScript conventions).

3. **Message Class Usage**:
  - The README included a `UserLoginMessage` example, but the demo uses `UserDetailsMessage`. The `UserLoginMessage` in the README didn’t match the demo’s structure.
  - The README referenced `StellaNowJsonMessage`, which has been removed from the SDK.

4. **Callback Handling**:
  - The README didn’t include the demo’s interval-based message sending or stdin-based stopping mechanism.

5. **Logger Usage**:
  - The README’s logger usage was inconsistent; the demo uses `logger.info` and `logger.error` directly.

6. **Imports and Module Structure**:
  - The README’s imports didn’t fully match the demo’s structure (e.g., missing `EntityType` in some contexts).

### Updated README

I’ll update the README to reflect the demo app, correcting the sample application and usage examples. I’ll assume `StellaNowAuthenticationService` was a typo or outdated concept, and use `OidcMqttAuthStrategy` as shown. Here’s the revised README:

# StellaNowSDK

## Introduction

Welcome to the StellaNow TypeScript SDK! This SDK provides an easy-to-use interface for developers to integrate their Node.js TypeScript applications with the StellaNow Platform. The SDK facilitates communication with the StellaNow Platform using the MQTT protocol over secure WebSockets, offering robust features for message handling and authentication.

## Table of Contents

- [Introduction](#introduction)
- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Setting Up StellaNow SDK](#setting-up-stellanow-sdk)
  - [Using OIDC Authentication](#using-oidc-authentication)
- [Usage](#usage)
  - [Sample Application](#sample-application)
  - [Message Formatting](#message-formatting)
- [Customization](#customization)
  - [Customizing the Message Queue Strategy](#customizing-the-message-queue-strategy)
  - [Adding a Custom Sink](#adding-a-custom-sink)
- [API Reference](#api-reference)
- [Support](#support)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [License](#license)

## Key Features

- **Automated Connection Handling**: Manages connection, disconnection, and reconnection with exponential backoff.
- **Message Queuing**: Implements a FIFO queue to handle network instability, with support for custom queue strategies.
- **Authentication Management**: Supports OIDC authentication with automatic token refreshing.
- **Flexible Message Sending**: Allows sending various message types wrapped in `StellaNowMessageWrapper`.
- **Per-Message Callbacks**: Notifies of successful message acknowledgment via `OnMessageAck`.
- **Extensibility**: Supports custom sinks, queue strategies, and authentication mechanisms.

## Prerequisites

- A StellaNow account with access to the Operators Console for configuration.
- Node.js (v14.x or later) and npm installed.
- Environment variables set (see [Configuration](#configuration)).

## Installation

The StellaNow SDK is available via npm. To install it, run the following command in your project directory:

```bash
npm install stellanow-sdk
```

> **Note**: If the package is not yet published, this is a placeholder. Check the [GitHub repository](https://github.com/stella-tech/stella-now-sdk) for the latest release status or build from source using `npm install` in the repository.

## Configuration

The SDK supports OIDC authentication via `OidcMqttAuthStrategy` and integrates with an MQTT sink. Configuration is managed through environment variables and provided objects.

### Setting Up StellaNow SDK

Set the following environment variables before initializing the SDK:

- `OIDC_USERNAME`: Your API key for authentication.
- `OIDC_PASSWORD`: Your API secret for authentication.
- `ORGANIZATION_ID`: The unique identifier for your organization.
- `PROJECT_ID`: The unique identifier for your project.

Then, initialize the SDK with the appropriate configuration:

```typescript
import {
  ProjectInfo,
  Credentials,
  DefaultLogger,
  EnvConfig,
  FifoQueue,
  StellaNowMqttSink,
  StellaNowSDK,
  OidcMqttAuthStrategy,
} from 'stella-now-sdk';

const logger = new DefaultLogger();
const projectInfo = ProjectInfo.createFromEnv();
const credentials = Credentials.createFromEnv();
const envConfig = EnvConfig.saasProd();

const authStrategy = new OidcMqttAuthStrategy(logger, envConfig, projectInfo, credentials);
const mqttSink = new StellaNowMqttSink(logger, authStrategy, projectInfo, envConfig);
const sdk = new StellaNowSDK(projectInfo, mqttSink, new FifoQueue(), logger);
```

### Using OIDC Authentication

The SDK uses `OidcMqttAuthStrategy` for OIDC authentication, handling token retrieval and refreshing automatically.

```typescript
import {
  OidcMqttAuthStrategy,
  StellaNowMqttSink,
  StellaNowSDK,
  ProjectInfo,
  Credentials,
  EnvConfig,
  DefaultLogger,
  FifoQueue,
} from 'stella-now-sdk';

const logger = new DefaultLogger();
const projectInfo = ProjectInfo.createFromEnv();
const credentials = Credentials.createFromEnv();
const envConfig = EnvConfig.saasProd();

const authStrategy = new OidcMqttAuthStrategy(logger, envConfig, projectInfo, credentials);
const mqttSink = new StellaNowMqttSink(logger, authStrategy, projectInfo, envConfig);
const sdk = new StellaNowSDK(projectInfo, mqttSink, new FifoQueue(), logger);

await sdk.start();
```

This configuration:
- Authenticates with OIDC using the provided `API_KEY` and `API_SECRET`.
- Uses the resulting access token for MQTT broker authentication.
- Establishes a secure connection to the MQTT sink.

## Usage

### Sample Application

Below is a sample application demonstrating how to use the StellaNowSDK to send `UserDetailsMessage` periodically, with a mechanism to stop sending via Enter key.

```typescript
import {
  ProjectInfo,
  Credentials,
  EnvConfig,
  DefaultLogger,
  FifoQueue,
  StellaNowMqttSink,
  StellaNowSDK,
  OidcMqttAuthStrategy,
  EntityType,
} from 'stella-now-sdk';
import { PhoneNumberModel } from './messages/models/PhoneNumber';
import { UserDetailsMessage } from './messages/UserDetailsMessage';

async function main(): Promise<void> {
  const logger = new DefaultLogger();
  const projectInfo = ProjectInfo.createFromEnv();
  const credentials = Credentials.createFromEnv();
  const envConfig = EnvConfig.saasProd();

  logger.info('API Base URL:', envConfig.apiBaseUrl);
  logger.info('Broker URL:', envConfig.brokerUrl);

  const authStrategy = new OidcMqttAuthStrategy(logger, envConfig, projectInfo, credentials);
  const mqttSink = new StellaNowMqttSink(logger, authStrategy, projectInfo, envConfig);
  const sdk = new StellaNowSDK(projectInfo, mqttSink, new FifoQueue(), logger);

  logger.info('Starting service up');

  sdk.OnError.subscribe((err) => logger.error('Error with Stella service:', err));
  sdk.OnDisconnected.subscribe(() => logger.info('Stella service disconnected'));
  sdk.OnConnected.subscribe(() => logger.info('Stella service connected'));

  try {
    await sdk.start();
    logger.info('StellaNowSDK started successfully');

    const intervalId = setInterval(() => {
      const userDetailsMessage = new UserDetailsMessage(
        'e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8',
        'd7db42f0-13ab-4c89-a7c8-fae73691d3ed',
        new PhoneNumberModel(44, 753594)
      );
      sdk.sendMessage(userDetailsMessage);
      logger.info(`Enqueued message at ${new Date().toISOString()}`);
    }, 1000);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === '\n' || key === '\r') {
        clearInterval(intervalId);
        logger.info('Stopped sending messages. Press Ctrl+C to exit.');
      }
    });

    process.stdin.resume();
  } catch (err) {
    logger.error('Failed to start StellaNowSDK:', String(err));
    process.exit(1);
  }
}

main().catch((err) => {
  const logger = new DefaultLogger();
  logger.error('Main process failed:', String(err));
  process.exit(1);
});
```

This example:
- Sets up the SDK with OIDC authentication using `OidcMqttAuthStrategy`.
- Sends `UserDetailsMessage` every second when connected.
- Stops sending on Enter key press, with error and disconnection handling.

### Message Formatting

Messages in StellaNowSDK are wrapped in `StellaNowMessageWrapper`. Each message type extends `StellaNowMessageBase` and implements the `ToJSON` interface. Examples include:

- **PhoneNumberModel**:
```typescript
import { Converters, ToJSON } from 'stella-now-sdk';

export class PhoneNumberModel implements ToJSON {
  constructor(
    public readonly country_code: number,
    public readonly number: number
  ) {}

  public toJSON(): object {
    return {
      country_code: Converters.convert(this.country_code),
      number: Converters.convert(this.number),
    };
  }
}
```

- **UserDetailsMessage**:
```typescript
import { StellaNowMessageBase, Converters, EntityType, ToJSON } from 'stella-now-sdk';
import { PhoneNumberModel } from './models/PhoneNumber';

export class UserDetailsMessage extends StellaNowMessageBase implements ToJSON {
  constructor(
    public readonly patron_id: string,
    public readonly user_id: string,
    public readonly phone_number: PhoneNumberModel
  ) {
    super('user_details', [new EntityType('patron', patron_id)]);
  }

  public toJSON(): object {
    return {
      user_id: Converters.convert(this.user_id),
      phone_number: Converters.convert(this.phone_number),
      ...super.toJSON(),
    };
  }
}
```

To avoid manual errors, use the **StellaNow CLI** tool to generate message classes based on the Operators Console configuration. Install it with:

```bash
pip install stellanow-cli
```

Follow the [StellaNow CLI documentation](https://github.com/stella-tech/stella-now-cli) for detailed instructions. Manually writing message classes is discouraged to ensure alignment with the platform’s schema.

## Customization

StellaNowSDK offers flexibility to adapt to specific needs.

### Customizing the Message Queue Strategy

By default, `StellaNowSDK` uses an in-memory `FifoQueue`. For persistence across restarts, implement a custom queue by extending `IStellaNowMessageSource`.

```typescript
import type { IStellaNowMessageSource } from 'stella-now-sdk';

class PersistentQueue implements IStellaNowMessageSource {
  // Implement queue methods with persistence logic
  enqueue(event: StellaNowEventWrapper): boolean { /* ... */ }
  // ... other methods
}

const sdk = new StellaNowSDK(projectInfo, mqttSink, new PersistentQueue(), logger);
```

> **Performance Considerations**: Persistent queues add latency; design them to balance reliability and performance.

### Adding a Custom Sink

The SDK supports MQTT via `StellaNowMqttSink`, but you can create custom sinks by implementing `IStellaNowSink`.

```typescript
import type { IStellaNowSink } from 'stella-now-sdk';

class CustomSink implements IStellaNowSink {
  readonly IsConnected: boolean = false;
  OnConnected: StellaNowSignal<() => void> = new StellaNowSignal();
  // ... other properties and methods
}

const customSink = new CustomSink();
const sdk = new StellaNowSDK(projectInfo, customSink, new FifoQueue(), logger);
```

## API Reference

- **[Types](https://github.com/stella-tech/stella-now-sdk/blob/main/src/lib/types/index.ts)**: Includes `ILogger`, `StellaNowCredentials`, `StellaNowEnvironmentConfig`, `StellaNowProjectInfo`.
- **[Core](https://github.com/stella-tech/stella-now-sdk/blob/main/src/lib/core/messages.ts)**: `StellaNowMessageWrapper`, `EntityType`, `Converters`.
- **[Events](https://github.com/stella-tech/stella-now-sdk/blob/main/src/lib/core/events.ts)**: `StellaNowEventWrapper`, `EventKey`.
- **[Sinks](https://github.com/stella-tech/stella-now-sdk/blob/main/src/lib/sinks/mqtt/mqtt-sink.ts)**: `StellaNowMqttSink`, with exceptions like `MqttConnectionException`, `SinkInitializationError`, `SinkOperationError`.
- **[SDK](https://github.com/stella-tech/stella-now-sdk/blob/main/src/lib/stella-now-sdk.ts)**: `StellaNowSDK`, with methods `start`, `stop`, `sendMessage`.

Detailed JSDoc is available in the source code.

## Support

For issues or feature requests, create a new issue on our [GitHub repository](https://github.com/stella-tech/stella-now-sdk). For further assistance, contact our support team at [help@stella.systems](mailto:help@stella.systems).

## Contributing

We welcome contributions! Please fork the repository, create a feature branch, and submit a pull request. Follow the [Contributing Guidelines](https://github.com/stella-tech/stella-now-sdk/blob/main/CONTRIBUTING.md) (to be created) for details.

## Documentation

Detailed API documentation will be available soon at [docs.stella.cloud](https://docs.stella.cloud). For now, refer to the inline JSDoc and this README.

## License

This project is licensed under the MIT License.