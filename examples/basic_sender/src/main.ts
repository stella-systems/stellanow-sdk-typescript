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

import {
    Credentials,
    DefaultLogger,
    EnvConfig,
    ProjectInfo,
    StellaNowSDK,
} from 'stellanow-sdk';

import { PhoneNumberModel } from './messages/models/PhoneNumber.ts';
import { UserDetailsMessage } from './messages/UserDetailsMessage.ts';


async function main(): Promise<void> {
    const logger = new DefaultLogger();
    let stellaSDK: StellaNowSDK;
    try {
        stellaSDK = await StellaNowSDK.createWithMqttAndOidc(logger, 
            ProjectInfo.createFromEnv(),
        Credentials.createFromEnv(),
        EnvConfig.saasDev(),
        );
    } catch (err) {
        logger.error('Failed to create StellaNowSDK:', String(err));
        process.exit(1); // or handle error appropriately
    }

    logger.info('Starting service up');

    stellaSDK.OnError.subscribe(err => {
        logger.info('Error with stella service:', err);
    });

    stellaSDK.OnDisconnected.subscribe(() => {
        logger.info('Stella service disconnected');
    });

    stellaSDK.OnConnected.subscribe(() => {
        logger.info('Stella service connected');
    });

    try {
        await stellaSDK.start();
        logger.info('StellaNowSDK started successfully');

        // Start sending messages every 1 second
        const intervalId = setInterval(() => {
            const userDetailsMessage = new UserDetailsMessage(
                'e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8',
                'd7db42f0-13ab-4c89-a7c8-fae73691d3ed',
                new PhoneNumberModel(44, 753594)
            );

            stellaSDK.sendMessage(userDetailsMessage);
            logger.info(`Enqueued messages at ${new Date().toISOString()}`);
        }, 1000);

        // Stop sending messages when Enter key is pressed
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (key: string) => {
            // Assert key as string since encoding is utf8
            if (key === '\n' || key === '\r') {
                clearInterval(intervalId);
                logger.info('Stopped sending messages. Press Ctrl+C to exit.');
            }
        });

        process.stdin.resume();
    } catch (err) {
        logger.error('Failed to start StellaNowSDK:', String(err));
        process.exit(1); // Exit on failure
    }

    // Keep the process running until manually stopped
}

main().catch(err => {
    const logger = new DefaultLogger();

    logger.error('Main process failed:', String(err));
    process.exit(1);
});
