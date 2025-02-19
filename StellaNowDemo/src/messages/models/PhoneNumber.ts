import { ToJSON, Convertors } from "stella-sdk-typescript"

export class PhoneNumberModel implements ToJSON
{
  constructor(
    public readonly country_code: number,
    public readonly number: number) 
  {}

  public toJSON(): any {
    return {
      country_code: Convertors.Convert(this.country_code),
      number: Convertors.Convert(this.number),
    }
  }
};