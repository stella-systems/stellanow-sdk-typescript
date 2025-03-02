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

import { Convertors, ToJSON, StellaNowMessageWrapper } from "./Messages.js";
import { StellaProjectInfo } from "../types/index.js";

class EventKey implements ToJSON {
  constructor(
    public organizationId: string,
    public projectId: string,
    public eventId: string,
  ) {}

  public toJSON(): any {
    return {
      organizationId: this.organizationId,
      projectId: this.projectId,
      eventId: this.eventId,
    };
  }
}

class StellaNowEventWrapper implements ToJSON {
  constructor(
    public eventKey: EventKey,
    public value: StellaNowMessageWrapper,
  ) {}

  public toJSON(): any {
    return {
      key: Convertors.Convert(this.eventKey),
      value: Convertors.Convert(this.value),
    };
  }

  public static fromWrapper(
    projectInfo: StellaProjectInfo,
    value: StellaNowMessageWrapper,
  ): StellaNowEventWrapper {
    var eventId = value.metadata.entityTypeIds[0].entityId;

    return new StellaNowEventWrapper(
      new EventKey(projectInfo.organizationId, projectInfo.projectId, eventId),
      value,
    );
  }
}

export { EventKey, StellaNowEventWrapper };
