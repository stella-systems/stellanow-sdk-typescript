import type { ToJSON } from 'stellanow-sdk';
import {
    StellaNowMessageBase,
    Converters,
    EntityType
} from 'stellanow-sdk';

export class UserLoginMessage extends StellaNowMessageBase implements ToJSON {
    constructor(
        public readonly patron_id: string,
        public readonly user_id: string,
        public readonly timestamp: string,
        public readonly user_group_id: string
    ) {
        super('user_login', [new EntityType('patron_id', patron_id)]);
    }

    public toJSON(): object {
        return {
            user_id: Converters.convert(this.user_id),
            timestamp: Converters.convert(this.timestamp),
            user_group_id: Converters.convert(this.user_group_id),

            ...super.toJSON(),
        };
    }
}
