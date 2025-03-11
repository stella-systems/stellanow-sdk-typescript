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

import { UnknownTypeError } from './exceptions.ts';

/**
 * Represents an object that can be serialized to JSON.
 * @remarks Defines a contract for objects that can provide a JSON representation via the toJSON method.
 */
export interface ToJSON {
    /**
     * Converts the object to its JSON representation.
     * @returns {object} The JSON-serializable representation of the object.
     */
    toJSON(): object;
}

/**
 * Helper type to represent an object with a toJSON property.
 */
interface HasToJson {
    toJSON: unknown;
}

/**
 * Type guard to check if an object implements the ToJSON interface.
 * @param obj - The object to test for ToJSON implementation.
 * @returns {boolean} True if the object has a toJSON method, false otherwise.
 * @example
 * const testObj = { toJSON: () => ({ key: 'value' }) };
 * console.log(isToJson(testObj)); // true
 */
function isToJson(obj: unknown): obj is ToJSON {
    if (obj == null || typeof obj !== 'object') {
        return false;
    }
    const objWithToJson = obj as HasToJson;
    return 'toJSON' in objWithToJson && typeof objWithToJson.toJSON === 'function';
}

/**
 * Formats a Date object into an ISO 8601 string with microseconds.
 * @param date - The Date object to format.
 * @returns {string} The ISO 8601 formatted date string with microseconds (e.g., "2025-02-18T11:09:44.650000Z").
 * @remarks JavaScript's Date API provides milliseconds; microseconds are padded with '000'.
 * @example
 * const date = new Date();
 * console.log(formatDateToIso8601(date)); // "2025-02-18T11:09:44.650000Z"
 */
function formatDateToIso8601(date: Date): string {
    return date.toISOString().replace('Z', '000Z');
}

/**
 * Utility class for converting various types to their JSON representations.
 * @remarks Provides static methods to handle conversion of Date, string, number, boolean, ToJSON, and arrays of ToJSON objects.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Converters {
    /**
     * Converts a value to its JSON representation based on its type.
     * @param value - The value to convert (Date, string, number, boolean, ToJSON, or ToJSON[]).
     * @returns {string} The converted value as a string.
     */
    static convert(value: Date): string;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    static convert(value: string): string;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    static convert(value: number): string;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    static convert(value: boolean): string;
    /**
     * Converts a value to its JSON representation based on its type.
     * @param value - The value to convert (ToJSON).
     * @returns {object} The JSON representation of the ToJSON object.
     */
    static convert(value: ToJSON): object;
    /**
     * Converts a value to its JSON representation based on its type.
     * @param value - The value to convert (array of ToJSON objects).
     * @returns {object[]} The JSON representations of the ToJSON array.
     */
    static convert(value: ToJSON[]): object[];

    /**
     * Converts a value to its JSON representation based on its type.
     * @param value - The value to convert (Date, string, number, boolean, ToJSON, or ToJSON[]).
     * @returns {string | object | object[]} The converted value as a string, object, or array of objects.
     * @throws {UnknownTypeError} If an unsupported type is passed to convert.
     * @example
     * const date = new Date();
     * console.log(Converters.convert(date)); // "2025-02-18T11:09:44.650000Z"
     */
    static convert(
        value: Date | string | number | boolean | ToJSON | ToJSON[]
    ): string | object | object[] {
        if (Array.isArray(value)) {
            if (value.every(isToJson)) {
                return value.map(v => v.toJSON());
            }
            throw new UnknownTypeError('Array elements must implement ToJSON');
        } else if (value instanceof Date) {
            return formatDateToIso8601(value);
        } else if (isToJson(value)) {
            return value.toJSON();
        } else if (typeof value === 'boolean') {
            return value.toString();
        } else if (typeof value === 'string') {
            return value;
        }
        // At this point, value must be a number (all other types are handled above)
        return value.toString();
    }
}