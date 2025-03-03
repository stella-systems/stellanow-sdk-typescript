import { StellaNowEventWrapper } from "../core/Events.js";
import { StellaNowSignal } from "../core/StellaNowSignal.js";

interface IStellaNowSink {
  OnConnected: StellaNowSignal<() => void>;
  OnDisconnected: StellaNowSignal<() => void>;
  OnError: StellaNowSignal<(message: string) => void>;

  Start(): Promise<void>;
  Stop(): void;

  CanPublish(): boolean;
  Publish(event: StellaNowEventWrapper): void;
}

export { IStellaNowSink };
