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

import * as crypto from 'crypto'; // Explicit import for type safety

import { Converters, ToJSON } from './converters.ts';
import { getErrorMessage } from './utilities.ts';

/**
 * Represents an entity type with its definition and identifier.
 */
class EntityType implements ToJSON {
    /**
     * Creates a new EntityType instance.
     * @param entityTypeDefinitionId - The definition identifier of the entity type.
     * @param entityId - The unique identifier of the entity.
     */
    constructor(
        public readonly entityTypeDefinitionId: string,
        public readonly entityId: string
    ) {}

    /**
     * Converts the EntityType instance to a JSON object.
     * @returns {object} The JSON representation of the EntityType.
     */
    public toJSON(): object {
        return {
            entityTypeDefinitionId: Converters.convert(this.entityTypeDefinitionId),
            entityId: Converters.convert(this.entityId),
        };
    }
}

/**
 * Metadata associated with a StellaNow message.
 */
class MessageMetadata implements ToJSON {
    /**
     * Creates a new MessageMetadata instance.
     * @param messageId - The unique message identifier.
     * @param messageOriginDateUtc - The message's origin date in UTC.
     * @param eventTypeDefinitionId - The event type definition identifier.
     * @param entityTypeIds - An array of EntityType instances.
     */
    constructor(
        public readonly messageId: string,
        public readonly messageOriginDateUtc: Date,
        public readonly eventTypeDefinitionId: string,
        public readonly entityTypeIds: EntityType[]
    ) {}

    /**
     * Converts the metadata to a JSON object.
     * @returns {object} The JSON representation of the metadata.
     */
    public toJSON(): object {
        return {
            messageId: Converters.convert(this.messageId),
            messageOriginDateUTC: Converters.convert(this.messageOriginDateUtc),
            eventTypeDefinitionId: Converters.convert(this.eventTypeDefinitionId),
            entityTypeIds: Converters.convert(this.entityTypeIds),
        };
    }
}

/**
 * Base class for StellaNow messages.
 */
class StellaNowMessageBase implements ToJSON {
    /**
     * Creates a new StellaNowMessageBase instance.
     * @param eventTypeDefinitionId - The event type definition identifier.
     * @param entityTypeIds - An array of EntityType instances.
     */
    constructor(
        public readonly eventTypeDefinitionId: string,
        public readonly entityTypeIds: EntityType[]
    ) {}

    /**
     * Converts the message base to a JSON object.
     * @returns {object} An empty JSON object (to be overridden by subclasses).
     */
    public toJSON(): object {
        return {};
    }
}

/**
 * A wrapper for StellaNow messages that includes metadata and payload.
 */
class StellaNowMessageWrapper implements ToJSON {
    public readonly metadata: MessageMetadata;
    public readonly payload: string = '';

    /**
     * Creates a new StellaNowMessageWrapper from a base message.
     * @param stellaNowMessage - The base StellaNow message.
     * @returns {StellaNowMessageWrapper} A wrapped message instance.
     */
    public static fromMessage(stellaNowMessage: StellaNowMessageBase): StellaNowMessageWrapper {
        return new StellaNowMessageWrapper(
            stellaNowMessage.eventTypeDefinitionId,
            stellaNowMessage.entityTypeIds,
            JSON.stringify(stellaNowMessage.toJSON())
        );
    }

    /**
     * Creates a new StellaNowMessageWrapper instance.
     * @param eventTypeDefinitionId - The event type definition identifier.
     * @param entityTypeIds - An array of EntityType instances.
     * @param messageJson - The JSON string representing the message payload.
     * @throws {SyntaxError} If the messageJson is not valid JSON.
     * @throws {Error} If initialization fails due to other unexpected errors.
     */
    constructor(
        public readonly eventTypeDefinitionId: string,
        entityTypeIds: EntityType[],
        messageJson: string
    ) {
        try {
            this.metadata = new MessageMetadata(
                crypto.randomUUID(),
                new Date(),
                eventTypeDefinitionId,
                entityTypeIds
            );
            this.payload = messageJson;
        } catch (e) {
            throw new Error(`Failed to initialize wrapper: ${getErrorMessage(e)}`);
        }
    }

    /**
     * Converts the wrapped message to a JSON object.
     * @returns {object} The JSON representation containing metadata and payload.
     */
    public toJSON(): object {
        return {
            metadata: Converters.convert(this.metadata),
            payload: this.payload,
        };
    }
}

export {
    ToJSON,
    Converters,
    EntityType,
    StellaNowMessageBase,
    StellaNowMessageWrapper,
};