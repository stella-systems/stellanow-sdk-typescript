import {
  StellaNowMessageBase,
  ToJSON,
  Convertors,
} from "stella-sdk-typescript";
import { EntityType } from "stella-sdk-typescript";

export class UserLoginMessage extends StellaNowMessageBase implements ToJSON {
  constructor(
    public readonly patron_id: string,
    public readonly user_id: string,
    public readonly timestamp: string,
    public readonly user_group_id: string,
  ) {
    super("user_login", [new EntityType("patron_id", patron_id)]);
  }

  public toJSON(): any {
    return {
      user_id: Convertors.Convert(this.user_id),
      timestamp: Convertors.Convert(this.timestamp),
      user_group_id: Convertors.Convert(this.user_group_id),

      ...super.toJSON(),
    };
  }
}
