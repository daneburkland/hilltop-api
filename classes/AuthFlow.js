import * as dynamoDbLib from "../libs/dynamodb-lib";

export default class AuthFlow {
  constructor({ userId, noteId, origin, authedCookies } = {}) {
    this.userId = userId;
    this.noteId = noteId;
    this.origin = origin;
    this.authedCookies = authedCookies;
  }

  static from(json) {
    return Object.assign(new AuthFlow(), json);
  }

  static async get(json) {
    return await AuthFlow.from(json).get();
  }

  _getParams() {
    console.log("latestAuthFlowParams:", this.userId, this.origin);
    return {
      TableName: process.env.authFlowTableName,
      Key: {
        userId: this.userId,
        origin: this.origin
      }
    };
  }

  _updateParams() {
    return {
      TableName: process.env.authFlowTableName,
      Key: {
        userId: this.userId,
        origin: this.origin
      },
      UpdateExpression: "SET authedCookies = :authedCookies, noteId = :noteId",
      ExpressionAttributeValues: {
        ":authedCookies": this.authedCookies,
        ":noteId": this.noteId
      }
    };
  }

  async update() {
    await dynamoDbLib.call("update", this._updateParams());
  }

  async get() {
    console.log("fetching latest auth flow");
    const { Item } = await dynamoDbLib.call("get", this._getParams());
    console.log("successfully fetched latest auth flow:", Item);
    return Item;
  }
}
