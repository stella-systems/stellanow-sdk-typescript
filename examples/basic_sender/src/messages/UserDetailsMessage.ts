import type { ToJSON } from 'stellanow-sdk';
import {
    StellaNowMessageBase,
    Converters,
    EntityType
} from 'stellanow-sdk';

import type { PhoneNumberModel } from './models/PhoneNumber.js';

export class UserDetailsMessage extends StellaNowMessageBase implements ToJSON {
    constructor(
        public readonly patron_id: string,
        public readonly user_id: string,
        public readonly phone_number: PhoneNumberModel
    ) {
        super('user_details', [new EntityType('patron', patron_id)]);
    }

    public toJSON(): object {
        return {
            user_id: Converters.convert(this.user_id),
            phone_number: Converters.convert(this.phone_number),

            ...super.toJSON(),
        };
    }
}
