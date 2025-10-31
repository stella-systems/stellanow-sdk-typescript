// Copyright (C) 2025 Stella Technologies (UK) Limited.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

/**
 * Represents the possible states of an MQTT connection.
 */
export enum ConnectionState {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    DISCONNECTING = 'DISCONNECTING',
}

/**
 * Thread-safe connection state manager with proper state transitions.
 */
export class ConnectionStateManager {
    private _state: ConnectionState = ConnectionState.DISCONNECTED;
    private readonly validTransitions: Map<ConnectionState, Set<ConnectionState>>;

    constructor() {
        this.validTransitions = new Map([
            [ConnectionState.DISCONNECTED, new Set([ConnectionState.CONNECTING])],
            [ConnectionState.CONNECTING, new Set([ConnectionState.CONNECTED, ConnectionState.DISCONNECTED])],
            [ConnectionState.CONNECTED, new Set([ConnectionState.DISCONNECTING, ConnectionState.DISCONNECTED])],
            [ConnectionState.DISCONNECTING, new Set([ConnectionState.DISCONNECTED])],
        ]);
    }

    /**
     * Gets the current connection state.
     */
    public get state(): ConnectionState {
        return this._state;
    }

    /**
     * Checks if currently connected.
     */
    public get isConnected(): boolean {
        return this._state === ConnectionState.CONNECTED;
    }

    /**
     * Checks if currently connecting.
     */
    public get isConnecting(): boolean {
        return this._state === ConnectionState.CONNECTING;
    }

    /**
     * Checks if currently disconnected.
     */
    public get isDisconnected(): boolean {
        return this._state === ConnectionState.DISCONNECTED;
    }

    /**
     * Attempts to transition to a new state.
     * @param newState The state to transition to.
     * @returns True if the transition was successful, false otherwise.
     */
    public tryTransition(newState: ConnectionState): boolean {
        const validNextStates = this.validTransitions.get(this._state);
        if (!validNextStates || !validNextStates.has(newState)) {
            return false;
        }
        this._state = newState;
        return true;
    }

    /**
     * Forces a state transition (use with caution).
     * @param newState The state to force.
     */
    public forceState(newState: ConnectionState): void {
        this._state = newState;
    }

    /**
     * Resets the state to DISCONNECTED.
     */
    public reset(): void {
        this._state = ConnectionState.DISCONNECTED;
    }
}
