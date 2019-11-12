import AWS from "aws-sdk";
import { debug } from "../utils";
const cognito = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2016-04-18"
});

const userDebug = debug("User");
userDebug.enabled = true;

export default class User {
  constructor({ id, teamId, email } = {}) {
    this.id = id;
    this.teamId = teamId;
    this.email = email;
  }

  static fromCognitoObject(authProvider) {
    userDebug(`#fromCognitoObject`);
    return new User({
      id: authProvider.Username,
      email: authProvider.UserAttributes.find(attr => attr.Name === "email")
        .Value,
      teamId: authProvider.UserAttributes.find(
        attr => attr.Name === "custom:teamId"
      ).Value
    });
  }

  static async fetchFromAuthProvider(authProvider) {
    userDebug(`#fetchFromAuthProvider`);
    let userSub = authProvider.split(":CognitoSignIn:")[1];
    const user = await cognito
      .adminGetUser({
        UserPoolId: process.env.userPoolId,
        Username: userSub
      })
      .promise();
    return User.fromCognitoObject(user);
  }
}
