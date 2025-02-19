import { UserDetailsMessage } from './messages/UserDetailsMessage';
import { PhoneNumberModel } from './messages/models/PhoneNumber';

import { StellaNowMessageWrapper } from 'stella-sdk-typescript';
import { StellaNowEventWrapper } from 'stella-sdk-typescript';

import { Credentials } from 'stella-sdk-typescript';


var userDetailsMessage = new UserDetailsMessage(
  "e25bbbe0-38f4-4fc1-a819-3ad55bc6fcd8",
  "d7db42f0-13ab-4c89-a7c8-fae73691d3ed",
  new PhoneNumberModel(44, 753594));

var wrappedUserDetailsMessage = StellaNowMessageWrapper.fromMessage(userDetailsMessage);

var stellaCredentials = Credentials.new({
  organizationId: "938840ac-22b2-4b08-bf10-a2cadca25963",
  projectId: "5c6cff9e-05c4-428e-8a64-4310b7148675",
  apiKey: "api-key",
  apiSecret: "api-secret",
  clientId: "clientId",
});

var userDetailsEvent = StellaNowEventWrapper.fromWrapper(stellaCredentials, wrappedUserDetailsMessage);

console.log(JSON.stringify(userDetailsEvent, null, 2));
