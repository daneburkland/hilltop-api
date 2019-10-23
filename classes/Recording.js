import * as dynamoDbLib from "../libs/dynamodb-lib";
import { putObjectToS3 } from "../libs/s3-lib";
import axios from "axios";
import uuid from "uuid";
import TestRunResult from "./TestRunResult";

const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;

export default class Recording {
  constructor({ steps, puppeteerCode, location, code, cookies, userId } = {}) {
    this.noteId = uuid.v1();
    this.steps = steps;
    this.puppeteerCode = puppeteerCode;
    this.location = location;
    this.code = code;
    this.cookies = cookies;
    this.createdAt = Date.now();
    this.isActive = true;
    this.nextScheduledTest = expiration;
    this.userId = userId;
    this.results = [];
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
        ":attrValue": [
          {
            status: result.status,
            statusText: result.statusText,
            screenshots: result.screenshots,
            data: result.data
          }
        ],
        ":empty_list": []
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

  async execute() {
    // TODO: this should only run if 'active' is set
    console.log("Starting test run:\n");
    console.info("noteId:\n", this.noteId);
    console.info("code:\n", this.code);
    console.info("cookies:\n", this.cookies);
    let response, result, screenshots, resolvedScreenshots;
    const resultId = uuid.v1();
    try {
      response = await axios({
        method: "POST",
        url: `${process.env.hilltopChromeUrl}/function`,
        mode: "no-cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 25000,
        data: { code: this.code, context: { cookies: this.cookies } }
      });

      result = new TestRunResult();

      if (response.data.error) {
        console.log("Failed to run test");
        console.info("ERROR:\n");
        console.info(response.data.error);
      } else {
        console.log("Successfully ran test");
        console.info("RESULT:\n");
        console.info(response);
      }
    } catch (error) {
      console.error("Failed to run function:\n");
      console.error(error);
      result = TestRunResult.from({
        data: { error }
      });
    }

    try {
      screenshots = response.data.screenshots.map(({ data }, i) =>
        putObjectToS3({
          bucket: process.env.screenshotsBucket,
          key: `${this.noteId}-${resultId}-${i}`,
          data
        })
      );

      console.log("Starting to store screenshots:\n");
      resolvedScreenshots = await Promise.all(screenshots);
      console.log("Resolved screenshots:\n");
      console.info("SCREENSHOTS:\n", resolvedScreenshots);
      result.screenshots = resolvedScreenshots;
    } catch (err) {
      console.error("Failed to store screenshots:\n");
      console.error(err);
    }

    try {
      console.log("trying to Recording with new result");
      await this._addResult(result);
      console.log("successfuly saved");
      console.info("FINISH");
    } catch (e) {
      console.log("failure", e);
    }
  }
}
