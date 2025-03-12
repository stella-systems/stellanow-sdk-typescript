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

import type {StellaNowMessageWrapper, ToJSON} from './messages.ts';
import {Converters} from './messages.ts';
import type {StellaNowProjectInfo} from '../types/index.ts';

/**
 * Represents the key for a StellaNow event, consisting of organization, project, and entity identifiers.
 * @remarks Implements the ToJSON interface to provide a JSON representation of the event key.
 */
class EventKey implements ToJSON {
    /**
     * Creates a new EventKey instance.
     * @param organizationId - The unique identifier for the organization.
     * @param projectId - The unique identifier for the project within the organization.
     * @param entityId - The unique identifier for the entity associated with the event.
     * @param eventTypeDefinitionId - The unique identifier for the main entity type associated with the event.
     */
    constructor(
        public organizationId: string,
        public projectId: string,
        public entityId: string,
        public eventTypeDefinitionId: string
    ) {}

    /**
     * Converts the EventKey instance to a JSON object.
     * @returns {object} The JSON representation of the EventKey.
     */
    public toJSON(): object {
        return {
            organizationId: this.organizationId,
            projectId: this.projectId,
            entityId: this.entityId,
            eventTypeDefinitionId: this.eventTypeDefinitionId
        };
    }
}

/**
 * Represents a wrapper for StellaNow events, combining an event key with a message wrapper.
 * @remarks Implements the ToJSON interface to provide a JSON representation of the event wrapper.
 */
class StellaNowEventWrapper implements ToJSON {
    /**
     * Creates a new StellaNowEventWrapper instance.
     * @param eventKey - The EventKey instance representing the event's key.
     * @param value - The StellaNowMessageWrapper containing the event's message data.
     */
    constructor(
        public eventKey: EventKey,
        public value: StellaNowMessageWrapper
    ) {}

    /**
     * Gets the message ID from the wrapped StellaNowMessageWrapper.
     * @returns {string} The unique identifier of the message.
     */
    get MessageId(): string {
        return this.value.metadata.messageId;
    }

    /**
     * Converts the StellaNowEventWrapper to a JSON object.
     * @returns {object} The JSON representation of the event wrapper, containing the key and value.
     */
    public toJSON(): object {
        return {
            key: Converters.convert(this.eventKey),
            value: Converters.convert(this.value),
        };
    }

    /**
     * Creates a new StellaNowEventWrapper from a project info and message wrapper.
     * @param projectInfo - The project information containing organization and project IDs.
     * @param value - The StellaNowMessageWrapper containing the event's message data.
     * @returns {StellaNowEventWrapper} A new instance of StellaNowEventWrapper.
     * @throws {Error} If the entityTypeIds array in the message wrapper is empty.
     */
    public static fromWrapper(
        projectInfo: StellaNowProjectInfo,
        value: StellaNowMessageWrapper
    ): StellaNowEventWrapper {
        if (!value.metadata.entityTypeIds.length) {
            throw new Error('EntityTypeIds array cannot be empty');
        }

        return new StellaNowEventWrapper(
            new EventKey(
                projectInfo.organizationId,
                projectInfo.projectId,
                value.metadata.entityTypeIds[0].entityId,
                value.metadata.entityTypeIds[0].entityTypeDefinitionId
            ),
            value
        );
    }
}

export { EventKey, StellaNowEventWrapper };