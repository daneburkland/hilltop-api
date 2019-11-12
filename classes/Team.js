import * as dynamoDbLib from "../libs/dynamodb-lib";
import { debug } from "../utils";
const teamDebug = debug("Team");
teamDebug.enabled = true;

export default class Team {
  constructor({ teamId }) {
    this.teamId = teamId;
  }

  _getParams() {
    teamDebug(`#_getParams`);
    return {
      TableName: process.env.teamTableName,
      Key: {
        teamId: this.teamId
      }
    };
  }

  _createParams() {
    teamDebug(`#_createParams`);
    return {
      TableName: process.env.teamTableName,
      Item: this
    };
  }

  async get() {
    teamDebug(`#get`);
    const result = await dynamoDbLib.call("get", this._getParams());
    return result;
  }

  async create() {
    teamDebug(`#create`);
    await dynamoDbLib.call("put", this._createParams());
  }
}
