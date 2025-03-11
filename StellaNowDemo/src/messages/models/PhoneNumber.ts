import type { ToJSON } from 'stella-sdk-typescript';
import { Converters } from 'stella-sdk-typescript';

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
