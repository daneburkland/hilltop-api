import * as dynamoDbLib from "../libs/dynamodb-lib";
import { debug } from "../utils";

const authFlowDebug = debug("AuthFlow");
authFlowDebug.enabled = true;

export default class AuthFlow {
  constructor({ teamId, ownerId, recordingId, origin, authedCookies } = {}) {
    this.ownerId = ownerId;
    this.teamId = teamId;
    this.recordingId = recordingId;
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
        teamId: this.teamId,
        origin: this.origin
      }
    };
  }

  _updateParams() {
    authFlowDebug(`#_updateParams`);
    return {
      TableName: process.env.authFlowTableName,
      Key: {
        teamId: this.teamId,
        origin: this.origin
      },
      UpdateExpression:
        "SET authedCookies = :authedCookies, recordingId = :recordingId",
      ExpressionAttributeValues: {
        ":authedCookies": this.authedCookies,
        ":recordingId": this.recordingId
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
