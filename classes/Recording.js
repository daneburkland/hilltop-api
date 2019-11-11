import * as dynamoDbLib from "../libs/dynamodb-lib";
import axios from "axios";
import uuid from "uuid";
import TestRunResult from "./TestRunResult";
import AuthFlow from "./AuthFlow";
import { debug } from "../utils";

const recordingDebug = debug("Recording");
recordingDebug.enabled = true;

const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;

export default class Recording {
  constructor({
    steps,
    location,
    code,
    debugCode,
    cookies,
    ownerId,
    teamId,
    isAuthFlow
  } = {}) {
    this.recordingId = uuid.v1();
    this.steps = steps;
    this.location = location;
    this.code = code;
    this.debugCode = debugCode;
    this.cookies = cookies;
    this.authedCookies = null;
    this.createdAt = Date.now();
    this.isActive = true;
    this.nextScheduledTest = expiration;
    this.ownerId = ownerId;
    this.teamId = teamId;
    this.results = [];
    this.isAuthFlow = isAuthFlow;
  }

  static from(json) {
    recordingDebug(`#from: %o`, json);
    return Object.assign(new Recording(), json);
  }

  static async query({ teamId }) {
    recordingDebug(`#query: %o`, teamId);
    const params = {
      TableName: process.env.recordingTableName,
      KeyConditionExpression: "teamId = :teamId",
      ExpressionAttributeValues: {
        ":teamId": teamId
      }
    };

    const result = await dynamoDbLib.call("query", params);
    return result;
  }

  _getParams() {
    recordingDebug(`#_getParams`);
    return {
      TableName: process.env.recordingTableName,
      Key: {
        teamId: this.teamId,
        recordingId: this.recordingId
      }
    };
  }

  _createParams() {
    recordingDebug(`#_createParams`);
    return {
      TableName: process.env.recordingTableName,
      Item: this
    };
  }

  _updateToActiveParams() {
    recordingDebug(`#_updateToActiveParams`);
    return {
      TableName: process.env.recordingTableName,
      Key: {
        teamId: this.teamId,
        recordingId: this.recordingId
      },
      UpdateExpression:
        "SET isActive = :isActive, nextScheduledTest = :nextScheduledTest",
      ExpressionAttributeValues: {
        ":isActive": true,
        ":nextScheduledTest": this.nextScheduledTest
      }
    };
  }

  _updateToInactiveParams() {
    recordingDebug(`#_updateToInactiveParams`);
    return {
      TableName: process.env.recordingTableName,
      Key: {
        teamId: this.teamId,
        recordingId: this.recordingId
      },
      UpdateExpression:
        "SET isActive = :isActive, nextScheduledTest = :nextScheduledTest",
      ExpressionAttributeValues: {
        ":isActive": false,
        ":nextScheduledTest": null
      }
    };
  }

  _addResultParams(result) {
    recordingDebug(`#_addResultParams: %o`, result);
    return {
      TableName: process.env.recordingTableName,
      Key: {
        teamId: this.teamId,
        recordingId: this.recordingId
      },
      UpdateExpression:
        "SET #attrName = list_append(if_not_exists(#attrName, :empty_list), :attrValue)",
      ExpressionAttributeNames: {
        "#attrName": "results"
      },
      ExpressionAttributeValues: {
        ":attrValue": [result],
        ":empty_list": []
      }
    };
  }

  _updateNextScheduledTestParams() {
    recordingDebug(`#updateNextScheduledTestParams`);
    return {
      TableName: process.env.recordingTableName,
      Key: {
        ownerId: this.ownerId,
        recordingId: this.recordingId
      },
      UpdateExpression: "SET nextScheduledTest = :nextScheduledTest",
      ExpressionAttributeValues: {
        ":nextScheduledTest": this.nextScheduledTest
      }
    };
  }

  async updateNextScheduledTest() {
    recordingDebug(`#updateNextScheduledTest`);
    await dynamoDbLib.call("update", this._updateNextScheduledTestParams());
  }

  async get() {
    recordingDebug(`#get`);
    const result = await dynamoDbLib.call("get", this._getParams());
    return result;
  }

  async create() {
    recordingDebug(`#create`);
    await dynamoDbLib.call("put", this._createParams());
  }

  async updateToActive() {
    recordingDebug(`#updateToActive`);
    await dynamoDbLib.call("update", this._updateToActiveParams());
  }

  async updateToInactive() {
    recordingDebug(`#updateToInactive`);
    await dynamoDbLib.call("update", this._updateToInactiveParams());
  }

  async _addResult(result) {
    recordingDebug(`#_addResult: %o`, result);
    await dynamoDbLib.call("update", this._addResultParams(result));
  }

  async _updateAuthFlow({ authedCookies }) {
    recordingDebug(`#_updateAuthFlow`);
    const authFlow = AuthFlow.from({
      ownerId: this.ownerId,
      teamId: this.teamId,
      origin: this.location.origin,
      authedCookies: authedCookies,
      recordingId: this.recordingId
    });
    await authFlow.update();
  }

  async _updateCookies() {
    recordingDebug(`#_updateCookies`);
    const authFlow = await AuthFlow.get({
      ownerId: this.ownerId,
      teamId: this.teamId,
      recordingId: this.recordingId,
      origin: this.location.origin
    });
    if (!authFlow) return;
    let authFlowRecording;
    try {
      const result = await Recording.from({
        teamId: authFlow.teamId,
        recordingId: authFlow.recordingId
      }).get();
      authFlowRecording = Recording.from(result.Item);
    } catch (e) {
      console.log("error fetching authFlowRecording", e);
    }

    try {
      await authFlowRecording.execute();
    } catch (e) {
      console.log("failed to execute authFlowRecording", e);
    }

    this.authedCookies = authFlowRecording.authedCookies;
  }

  async execute() {
    recordingDebug(`#execute: %o`, this);
    // TODO: this should only run if 'active' is set

    if (!this.isAuthFlow) {
      await this._updateCookies();
    }

    let result;
    try {
      const response = await axios({
        method: "POST",
        url: `${process.env.hilltopChromeUrl}/function`,
        mode: "no-cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 25000,
        data: {
          code: this.code,
          context: { cookies: this.authedCookies || this.cookies }
        }
      });
      result = await TestRunResult.build(response);
    } catch (error) {
      console.error("Failed to run function:\n");
      console.error(error);
      result = TestRunResult.from({
        data: { error: error.data }
      });
    }

    if (!!this.isAuthFlow && !result.error) {
      try {
        await this._updateAuthFlow(result);
        this.authedCookies = result.authedCookies;
      } catch (e) {
        console.log("failed to update auth flow", e);
      }
    }

    try {
      await this._addResult(result);
    } catch (e) {
      console.log("failure", e);
    }
  }
}
