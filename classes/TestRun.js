import * as dynamoDbLib from "../libs/dynamodb-lib";
import { debug } from "../utils";

const testRunDebug = debug("TestRun");
testRunDebug.enabled = true;

const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;

export default class TestRun {
  constructor({ userId, noteId, code, cookies, isAuthFlow, location } = {}) {
    this.userId = userId;
    this.noteId = noteId;
    this.expiration = expiration;
    this.code = code;
    this.cookies = cookies;
    this.isActive = true;
    this.createdAt = Date.now();
    this.location = location;
    this.isAuthFlow = isAuthFlow;
  }

  static from(json) {
    testRunDebug(`#from: %o`, json);
    return Object.assign(new TestRun(), json);
  }

  _updateToInactiveParams() {
    testRunDebug(`#_updateToInactiveParams`);
    return {
      TableName: process.env.recordingTaskTableName,
      Key: {
        userId: this.userId,
        noteId: this.noteId
      },
      UpdateExpression: "SET isActive = :isActive",
      ExpressionAttributeValues: {
        ":isActive": false
      }
    };
  }

  _createParams() {
    testRunDebug(`#_createParams`);
    return {
      TableName: process.env.recordingTaskTableName,
      Item: this
    };
  }

  _reinsertParams() {
    testRunDebug(`#_reinsertParams`);
    return {
      TableName: process.env.recordingTaskTableName,
      Item: {
        ...this,
        expiration
      }
    };
  }

  async reinsert() {
    testRunDebug(`#reinsert`);
    await dynamoDbLib.call("put", this._reinsertParams());
  }

  async updateToInactive() {
    testRunDebug(`#updateToInactive`);
    await dynamoDbLib.call("update", this._updateToInactiveParams());
  }

  async create() {
    testRunDebug(`#create`);
    await dynamoDbLib.call("put", this._createParams());
  }
}
