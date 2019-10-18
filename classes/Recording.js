import * as dynamoDbLib from "../libs/dynamodb-lib";
import { putObjectToS3 } from "../libs/s3-lib";
import axios from "axios";
import uuid from "uuid";

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

  async runTest() {
    // TODO: this should only run if 'active' is set
    console.log("Starting test run:\n");
    console.info("noteId:\n", this.noteId);
    console.info("code:\n", this.code);
    let result, screenshots, resolvedScreenshots;
    const resultId = uuid.v1();
    try {
      result = await axios({
        method: "POST",
        url: `${process.env.hilltopChromeUrl}/function`,
        mode: "no-cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 15000,
        data: { code: this.code, context: { cookies: this.cookies } }
      });
      if (result.data.error) {
        console.log("Failed to run test");
        console.info("ERROR:\n");
        console.info(result.data.error);
        return { result };
      }
      console.log("Successfully ran test");
      console.info("RESULT:\n");
      console.info(result);
    } catch (err) {
      console.error("Failed to run function:\n");
      console.error(err);
      return err;
    }
    try {
      screenshots = result.data.screenshots.map(({ data }, i) =>
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
      return { result };
    } catch (err) {
      console.error("Failed to store screenshots:\n");
      console.error(err);
      return err;
    }
  }
}
