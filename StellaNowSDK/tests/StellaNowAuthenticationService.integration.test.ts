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

import { test, expect } from 'vitest';
import { StellaNowAuthenticationService } from '../src/lib/core/Authentication/StellaNowAuthenticationService.js';
import { DefaultLogger } from '../src/lib/core/DefaultLogger.js';
import { CredentialsFromEnv, EnvConfig, ProjectInfoFromEnv } from '../src/lib/types/index.js';
import { StellaNowCredentials } from '../src/index.js';

test('Live StellaNow authentication', async () => {
    // 1) Ensure environment variables are set, or skip/fail
    if (!process.env.API_KEY || !process.env.API_SECRET) {
        console.warn('Skipping live auth test: missing API_KEY or API_SECRET');
        return; // or throw an error to fail the test
    }

    // 2) Create the service with real env-based credentials
    const logger = new DefaultLogger();

    const service = new StellaNowAuthenticationService(
        logger,
        EnvConfig.saasProd(), // or your environment config
        ProjectInfoFromEnv(),
        CredentialsFromEnv()
    );

    await service.authenticate();

    // 4) Verify we got an access token
    const token = service.getAccessToken();
    expect(token).toBeTruthy();
});
