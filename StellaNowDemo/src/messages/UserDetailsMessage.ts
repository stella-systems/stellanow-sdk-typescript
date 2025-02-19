import { StellaNowMessageBase, ToJSON, Convertors } from "stella-sdk-typescript"
import { EntityType } from "stella-sdk-typescript"

import {PhoneNumberModel} from "./models/PhoneNumber"

export class UserDetailsMessage extends StellaNowMessageBase implements ToJSON {
    constructor(
      public readonly patron_id: string, 
      public readonly user_id: string, 
      public readonly phone_number: PhoneNumberModel) 
    {
      super("user_details", [new EntityType("patron_id", patron_id)])
    }
  
    public toJSON(): any {
      return {
        user_id: Convertors.Convert(this.user_id),
        phone_number: Convertors.Convert(this.phone_number),
  
        ...super.toJSON()
      }
    }
  }