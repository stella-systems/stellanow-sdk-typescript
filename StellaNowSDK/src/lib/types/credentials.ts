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

export class StellaProjectInfo {
    constructor(
        public organizationId: string,
        public projectId: string
    ) {}
}

export class StellaNowCredentials {
    static readonly DEFAULT_OIDC_CLIENT = 'event-ingestor';

    constructor(
        public apiKey: string,
        public apiSecret: string,
        public clientId: string,
        public oidcClient: string
    ) {}
}

/////////////////////////////////////////////
// These utilities will be node specific
/////////////////////////////////////////////

//
//  Will return the value of the requested environment variable if found, otherwise
//  - the "missing" is returned if it is not undefiend
//  - an error is logged and "" is returned if no missing value is defined
//
function readEnv(
    name: string,
    missing: string | undefined = undefined
): string {
    const value = process.env[name] || missing;
    if (value === undefined) {
        // TODO: Should use some logger that has been passed in
        console.error(
            'Cannot find the requested environment variable: ' + name
        );
        return '';
    }
    return value;
}

export function ProjectInfoFromEnv(): StellaProjectInfo {
    return new StellaProjectInfo(
        readEnv('ORGANIZATION_ID'),
        readEnv('PROJECT_ID')
    );
}

export function CredentialsFromEnv(): StellaNowCredentials {
    return new StellaNowCredentials(
        readEnv('STELLA_USERNAME'),
        readEnv('STELLA_PASSWORD'),
        readEnv('CLIENT_ID'),
        readEnv('OIDC_CLIENT', StellaNowCredentials.DEFAULT_OIDC_CLIENT)
    );
}
