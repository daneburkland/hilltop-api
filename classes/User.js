import AWS from "aws-sdk";
import * as dynamoDbLib from "../libs/dynamodb-lib";
import { debug } from "../utils";
const cognito = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2016-04-18"
});

export const ACTIVE_STATUSES = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE"
};

const userDebug = debug("User");
userDebug.enabled = true;

export default class User {
  constructor({ userId, teamId, email } = {}) {
    this.userId = userId;
    this.teamId = teamId;
    this.email = email;
    this.activeStatus = ACTIVE_STATUSES.PENDING;
  }

  _createParams() {
    userDebug(`#_createParams`);
    return {
      TableName: process.env.userTableName,
      Item: this
    };
  }

  _activateParams() {
    userDebug(`#_activateParams`);
    return {
      TableName: process.env.userTableName,
      Key: {
        userId: this.userId,
        teamId: this.teamId
      },
      UpdateExpression: "SET activeStatus = :activeStatus",
      ExpressionAttributeValues: {
        ":activeStatus": ACTIVE_STATUSES.ACTIVE
      }
    };
  }

  _createNewUserParams({ email }) {
    userDebug(`#_createNewUserParams`);
    return {
      UserPoolId: process.env.userPoolId,
      Username: email,
      DesiredDeliveryMediums: ["EMAIL"],
      UserAttributes: [
        {
          Name: "email",
          Value: email
        },
        {
          Name: "custom:teamId",
          Value: this.teamId
        }
      ]
    };
  }

  static fromCognitoCreateUserResponse({ User: user }) {
    userDebug(`#fromCognitoCreateUserResponse`);
    return new User({
      userId: user.Username,
      email: user.Attributes.find(attr => attr.Name === "email").Value,
      teamId: user.Attributes.find(attr => attr.Name === "custom:teamId").Value
    });
  }

  static fromCognitoObject(authProvider) {
    userDebug(`#fromCognitoObject`);
    return new User({
      userId: authProvider.Username,
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

  async create() {
    userDebug(`#create`);
    await dynamoDbLib.call("put", this._createParams());
  }

  setActive() {
    this.activeStatus = ACTIVE_STATUSES.ACTIVE;
  }

  setPending() {
    this.activeStatus = ACTIVE_STATUSES.PENDING;
  }

  async activate() {
    userDebug(`#activate`);
    await dynamoDbLib.call("update", this._activateParams());
  }

  async createNewUser({ email }) {
    userDebug("#createNewUser");
    let response;
    try {
      response = await cognito
        .adminCreateUser(this._createNewUserParams({ email }))
        .promise();
    } catch (e) {
      console.error("Failed to create cognito user:", e);
      return e.message;
    }

    const user = User.fromCognitoCreateUserResponse(response);
    user.setPending();
    try {
      await user.create();
    } catch (e) {
      console.error("failed to create user", e);
    }

    // TODO: this should return a scan by teamId
    return await user;
  }
}
