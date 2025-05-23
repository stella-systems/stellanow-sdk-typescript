/**
 *  This file is auto-generated by StellaNowCLI. DO NOT EDIT.
 * 
 *  ID: 3af70656-e95b-489d-ae2e-ebe7c0d011d6
 *  Generated: 2025-03-18T12:43:02Z
**/

import type { ToJSON } from 'stellanow-sdk';
import { StellaNowMessageBase, Converters, EntityType } from 'stellanow-sdk';

import type { PhoneNumberModel } from './models/phone-number-model.ts';

export class UserDetailsMessage extends StellaNowMessageBase implements ToJSON {
    constructor(
        public readonly patron: string,
        public readonly user_id: string,
        public readonly phone_number: PhoneNumberModel
    ) {
        super('user_details', [new EntityType('patron', patron)]);
    }

    public toJSON(): object {
        return {
            user_id: Converters.convert(this.user_id),
            phone_number: Converters.convert(this.phone_number),
            ...super.toJSON(),
        };
    }
}
/**
 *  Generated from:
 * {
 *     "createdAt": "2025-02-28 00:27:00",
 *     "updatedAt": "2025-02-28 00:27:25",
 *     "id": "3af70656-e95b-489d-ae2e-ebe7c0d011d6",
 *     "name": "user_details",
 *     "projectId": "4c9450e5-1a6e-4ab4-8b1d-43e9c2a40714",
 *     "isActive": true,
 *     "description": "",
 *     "fields": [
 *         {
 *             "id": "057074db-eb36-4d63-bf1a-f9eff3c214ba",
 *             "name": "user_id",
 *             "fieldType": {
 *                 "value": "String"
 *             },
 *             "required": true,
 *             "subfields": []
 *         },
 *         {
 *             "id": "5a2437a8-2dee-4cd2-8f7c-ab7b0db8f876",
 *             "name": "phone_number",
 *             "fieldType": {
 *                 "value": "Model",
 *                 "modelRef": "d3a72099-a3ff-453e-9628-9e8d7dba2714"
 *             },
 *             "required": false,
 *             "subfields": [
 *                 {
 *                     "id": "a22de624-eb54-40ab-a868-3cf52160ce6e",
 *                     "name": "number",
 *                     "fieldType": {
 *                         "value": "Integer"
 *                     },
 *                     "required": true,
 *                     "path": [
 *                         "phone_number",
 *                         "number"
 *                     ],
 *                     "modelFieldId": "b1914044-74ef-4af4-8e40-0a4dd48ea5d0"
 *                 },
 *                 {
 *                     "id": "7eb6e628-182e-489b-aa03-9efb03360379",
 *                     "name": "country_code",
 *                     "fieldType": {
 *                         "value": "Integer"
 *                     },
 *                     "required": true,
 *                     "path": [
 *                         "phone_number",
 *                         "country_code"
 *                     ],
 *                     "modelFieldId": "20ed506e-0913-44db-ba4a-02f2529caec2"
 *                 }
 *             ]
 *         }
 *     ],
 *     "entities": [
 *         {
 *             "id": "5ed0f3c9-e3a1-417c-b0da-277d863d88f1",
 *             "name": "patron"
 *         }
 *     ]
 * }
**/