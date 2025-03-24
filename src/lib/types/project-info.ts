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

import { PROJECT_INFO_ENV_VARS } from './constants.ts';
import { InvalidUuidError, MissingEnvVariableError } from '../core/exceptions.ts';
import { isUuid, readEnv } from '../core/utilities.ts';

/**
 * Interface representing project information for the StellaNow system.
 * @remarks Defines the structure for project details, including organization ID and project ID.
 */
export interface StellaNowProjectInfo {
    organizationId: string;
    projectId: string;
}

/**
 * Provides methods to create StellaNowProjectInfo instances.
 * @remarks Includes a generic creation method and an environment variable-based creation method.
 */
export const ProjectInfo = {
    /**
     * Creates a StellaNowProjectInfo instance with the provided values.
     * @param organizationId - The unique identifier for the organization.
     * @param projectId - The unique identifier for the project within the organization.
     * @returns {StellaNowProjectInfo} A new StellaNowProjectInfo instance.
     * @throws {InvalidArgumentError} If required arguments (organizationId, projectId) are empty or not provided.
     * @example
     * const project = ProjectInfo.create('org123', 'proj456');
     */
    create(organizationId: string, projectId: string): StellaNowProjectInfo {
        // Validate required arguments
        if (!isUuid(organizationId)) {
            throw new InvalidUuidError(PROJECT_INFO_ENV_VARS.ORGANIZATION_ID, organizationId);
        }
        if (!isUuid(projectId)) {
            throw new InvalidUuidError(PROJECT_INFO_ENV_VARS.PROJECT_ID, projectId);
        }

        return { organizationId, projectId };
    },

    /**
     * Creates a StellaNowProjectInfo instance using environment variables.
     * @returns {StellaNowProjectInfo} A new instance populated with ORGANIZATION_ID and PROJECT_ID from the environment.
     * @throws {MissingEnvVariableError} If required environment variables (ORGANIZATION_ID, PROJECT_ID) are not set.
     * @example
     * const projectInfo = ProjectInfo.createFromEnv();
     */
    createFromEnv(): StellaNowProjectInfo {
        const organizationId = readEnv(PROJECT_INFO_ENV_VARS.ORGANIZATION_ID);
        const projectId = readEnv(PROJECT_INFO_ENV_VARS.PROJECT_ID);

        // Validate environment variables
        if (!organizationId) {
            throw new MissingEnvVariableError(PROJECT_INFO_ENV_VARS.ORGANIZATION_ID);
        }
        if (!projectId) {
            throw new MissingEnvVariableError(PROJECT_INFO_ENV_VARS.PROJECT_ID);
        }

        return ProjectInfo.create(organizationId, projectId);
    }
};