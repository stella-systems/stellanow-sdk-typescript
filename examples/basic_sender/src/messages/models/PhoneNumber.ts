import type { ToJSON } from 'stellanow-sdk';
import { Converters } from 'stellanow-sdk';

export class PhoneNumberModel implements ToJSON {
    constructor(
        public readonly country_code: number,
        public readonly number: number
    ) {}

    public toJSON(): object {
        return {
            country_code: Converters.convert(this.country_code),
            number: Converters.convert(this.number),
        };
    }
}
