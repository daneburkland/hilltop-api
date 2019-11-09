import * as dynamoDbLib from "../libs/dynamodb-lib";
import axios from "axios";
import uuid from "uuid";
import TestRunResult from "./TestRunResult";

const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;

export default class Recording {
  constructor({
    steps,
    location,
    code,
    debugCode,
    cookies,
    userId,
    isAuthFlow
  } = {}) {
    this.noteId = uuid.v1();
    this.steps = steps;
    this.location = location;
    this.code = code;
    this.debugCode = debugCode;
    this.cookies = cookies;
    this.createdAt = Date.now();
    this.isActive = true;
    this.nextScheduledTest = expiration;
    this.userId = userId;
    this.results = [];
    this.isAuthFlow = isAuthFlow;
  }

  static from(json) {
    return Object.assign(new Recording(), json);
  }

  static async query({ userId }) {
    const params = {
      TableName: process.env.recordingTableName,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    };

    const result = await dynamoDbLib.call("query", params);
    return result;
  }

  _getParams() {
    return {
      TableName: process.env.recordingTableName,
      Key: {
        userId: this.userId,
        noteId: this.noteId
      }
    };
  }

  _createParams() {
    console.log("In Recording:");
    console.log(this);
    return {
      TableName: process.env.recordingTableName,
      Item: this
    };
  }

  _updateToActiveParams() {
    return {
      TableName: process.env.recordingTableName,
      Key: {
        userId: this.userId,
        noteId: this.noteId
      },
      UpdateExpression:
        "SET isActive = :isActive, nextScheduledTest = :nextScheduledTest",
      ExpressionAttributeValues: {
        ":isActive": true,
        ":nextScheduledTest": this.expiration
      }
    };
  }

  _updateToInactiveParams() {
    return {
      TableName: process.env.recordingTableName,
      Key: {
        userId: this.userId,
        noteId: this.noteId
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
    console.log("Add result params:\n");
    console.log(result);
    return {
      TableName: process.env.recordingTableName,
      Key: {
        userId: this.userId,
        noteId: this.noteId
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

  _fetchLatestAuthFlowParams() {
    return {
      TableName: process.env.authFlowTableName,
      KeyConditionExpression: "userId = :userId and origin = :origin",
      ExpressionAttributeValues: {
        ":userId": this.userId,
        ":origin": this.location.origin
      }
    };
  }

  _updateAuthFlowParams({ authedCookies }) {
    return {
      TableName: process.env.authFlowTableName,
      Key: {
        userId: this.userId,
        origin: this.location.origin
      },
      UpdateExpression:
        "SET authedCookies = :authedCookies, SET noteId = :noteId",
      ExpressionAttributeValues: {
        ":authedCookies": authedCookies,
        ":noteId": this.noteId
      }
    };
  }

  async get() {
    const result = await dynamoDbLib.call("get", this._getParams());
    return result;
  }

  async create() {
    await dynamoDbLib.call("put", this._createParams());
  }

  async updateToActive() {
    await dynamoDbLib.call("update", this._updateToActiveParams());
  }

  async updateToInactive() {
    await dynamoDbLib.call("update", this._updateToInactiveParams());
  }

  async _addResult(result) {
    await dynamoDbLib.call("update", this._addResultParams(result));
  }

  async _fetchLatestAuthFlow() {
    console.log("fetching latest auth flow");
    const authFlow = await dynamoDbLib.call(
      "get",
      this._fetchLatestAuthFlowParams()
    );
    console.log("successfully fetched latest auth flow:", authFlow);
    return authFlow;
  }

  async _updateAuthFlow(result) {
    await dynamoDbLib.call("update", this._updateAuthFlowParams(result));
  }

  async _updateCookies() {
    const authFlow = await this._fetchLatestAuthFlow();
    if (!authFlow) return;
    let authFlowRecording;
    console.log("getting authFlowRecording");
    try {
      authFlowRecording = await Recording.from({
        userId: authFlow.userId,
        noteId: authFlow.noteId
      }).get();
      console.log("successfully fetched authFlowRecording:", authFlowRecording);
    } catch (e) {
      console.log("error fetching authFlowRecording", e);
    }

    console.log("executing authFlowRecording");
    try {
      await authFlowRecording.execute();
    } catch (e) {
      console.log("failed to execute authFlowRecording", e);
    }

    this.authedCookies = authFlowRecording.authedCookies;
  }

  async execute() {
    // TODO: this should only run if 'active' is set
    console.log("Starting test run:\n");
    console.info("recording:\n", this);
    console.info("code:\n", this.code);
    console.info("cookies:\n", this.cookies);

    await this._updateCookies();
    console.log(
      `will use cookies: ${this.authedCookies ? "authedCookies" : "cookies"}`
    );

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
      console.log("result", result);
    } catch (error) {
      console.error("Failed to run function:\n");
      console.error(error);
      result = TestRunResult.from({
        data: { error: error.data }
      });
    }

    if (!!this.isAuthFlow && !result.error) {
      try {
        console.log("trying to update auth flow");
        await this._updateAuthFlow(result);
        console.log("successfully updated auth flow");

        console.log("adding authedCookies to auth flow recording");
        this.authedCookies = result.authedCookies;
      } catch (e) {
        console.log("failed to update auth flow", e);
      }
    }

    try {
      console.log("trying to update Recording with new result");
      await this._addResult(result);
      console.log("successfuly saved");
      console.info("FINISH");
    } catch (e) {
      console.log("failure", e);
    }
  }
}
