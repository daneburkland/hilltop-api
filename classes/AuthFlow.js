import * as dynamoDbLib from "../libs/dynamodb-lib";
import { debug } from "../utils";

const authFlowDebug = debug("AuthFlow");
authFlowDebug.enabled = true;

export default class AuthFlow {
  constructor({ userId, noteId, origin, authedCookies } = {}) {
    this.userId = userId;
    this.noteId = noteId;
    this.origin = origin;
    this.authedCookies = authedCookies;
  }

  static from(json) {
    authFlowDebug(`#from: %o`, json);
    return Object.assign(new AuthFlow(), json);
  }

  static async get(json) {
    authFlowDebug(`#get: %o`, json);
    return await AuthFlow.from(json).get();
  }

  _getParams() {
    authFlowDebug(`#_getParams`);
    return {
      TableName: process.env.authFlowTableName,
      Key: {
        userId: this.userId,
        origin: this.origin
      }
    };
  }

  _updateParams() {
    authFlowDebug(`#_updateParams`);
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
    authFlowDebug(`#update`);
    await dynamoDbLib.call("update", this._updateParams());
  }

  async get() {
    authFlowDebug(`#get`);
    const { Item } = await dynamoDbLib.call("get", this._getParams());
    return Item;
  }
}
