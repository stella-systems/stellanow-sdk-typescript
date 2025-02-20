interface ToJSON {
  toJSON(): object;
}

function IstoJSON(obj: any): obj is ToJSON {
  return (
    obj != null &&
    typeof obj === "object" &&
    "toJSON" in obj &&
    typeof obj.toJSON === "function"
  );
}

function formatDateToISO8601(date: Date): string {
  // Get date components in the ISO 8601 format
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");

  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  // Get milliseconds and convert to microseconds by appending '000'
  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, "0");
  const microseconds = milliseconds + "000";

  // Construct the final string in the desired format
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${microseconds}Z`;
}

class Convertors {
  static Convert(value: Date): string;
  static Convert(value: string): string;
  static Convert(value: number): string;
  static Convert(value: ToJSON): object;
  static Convert(value: ToJSON[]): object;

  static Convert(
    value: Date | string | number | ToJSON | ToJSON[],
  ): string | object | object[] {
    if (Array.isArray(value)) {
      return value.map((v) => v.toJSON());
    } else if (value instanceof Date) {
      return formatDateToISO8601(value);
    } else if (IstoJSON(value)) {
      return value.toJSON();
    } else if (typeof value === "boolean") {
      return value ? "true" : "false";
    } else if (typeof value === "string") {
      return value;
    } else if (typeof value === "number") {
      return value.toString();
    }
    throw "Unknown type passed to convert";
  }
}

class EntityType implements ToJSON {
  constructor(
    public readonly entityTypeDefinitionId: string,
    public readonly entityId: string,
  ) {}

  public toJSON(): any {
    return {
      entityTypeDefinitionId: Convertors.Convert(this.entityTypeDefinitionId),
      entityId: Convertors.Convert(this.entityId),
    };
  }
}

class StellaNowMessageBase implements ToJSON {
  constructor(
    public readonly event_type_definition_id: string,
    public readonly entity_type_ids: EntityType[],
  ) {}

  public toJSON(): any {
    return {};
  }
}

class StellaNowMessageMetadata implements ToJSON {
  constructor(
    public readonly messageId: string,
    public readonly messageOriginDateUTC: Date,
    public readonly eventTypeDefinitionId: string,
    public readonly entityTypeIds: EntityType[],
  ) {}

  public toJSON(): any {
    return {
      messageId: Convertors.Convert(this.messageId),
      messageOriginDateUTC: Convertors.Convert(this.messageOriginDateUTC),
      eventTypeDefinitionId: Convertors.Convert(this.eventTypeDefinitionId),
      entityTypeIds: Convertors.Convert(this.entityTypeIds),
    };
  }
}

class StellaNowMessageWrapper implements ToJSON {
  public readonly metadata: StellaNowMessageMetadata;
  public readonly payload: string = "";

  public static fromMessage(stellaNowMessage: StellaNowMessageBase) {
    return new StellaNowMessageWrapper(
      stellaNowMessage.event_type_definition_id,
      stellaNowMessage.entity_type_ids,
      JSON.stringify(stellaNowMessage.toJSON()),
    );
  }

  constructor(
    eventTypeDefinitionIdOrMessage: string,
    entityTypeIds: EntityType[],
    messageJson: string,
  ) {
    this.metadata = new StellaNowMessageMetadata(
      crypto.randomUUID(), // Equivalent to Guid.NewGuid().ToString()
      new Date("2025-02-18T11:09:44.650447Z"), //new Date(), // Equivalent to DateTime.UtcNow
      eventTypeDefinitionIdOrMessage,
      entityTypeIds,
    );
    this.payload = messageJson;
  }

  public toJSON(): any {
    return {
      metadata: Convertors.Convert(this.metadata),
      payload: this.payload,
    };
  }
}

export {
  ToJSON,
  Convertors,
  EntityType,
  StellaNowMessageBase,
  StellaNowMessageMetadata,
  StellaNowMessageWrapper,
};
