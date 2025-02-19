import { Convertors, ToJSON, StellaNowMessageWrapper } from "./Messages";
import { StellaNowCredentials } from "../types";

class EventKey implements ToJSON {
    constructor(public organizationId: string, public projectId: string, public eventId: string) { }

    public toJSON(): any {
        return {
            organizationId: this.organizationId,
            projectId: this.projectId,
            eventId: this.eventId
        }
    }
};

class StellaNowEventWrapper implements ToJSON {
    constructor(public eventKey: EventKey, public value: StellaNowMessageWrapper) { }

    public toJSON(): any {
        return {
            "key": Convertors.Convert(this.eventKey),
            "value": Convertors.Convert(this.value),
        }
    }

    public static fromWrapper(credentials: StellaNowCredentials, value: StellaNowMessageWrapper): StellaNowEventWrapper {
        var eventId = value.metadata.entityTypeIds[0].entityId;

        return new StellaNowEventWrapper(
            new EventKey(
                credentials.organizationId,
                credentials.projectId,
                eventId),
            value);
    }
}

export {
    EventKey,
    StellaNowEventWrapper
}