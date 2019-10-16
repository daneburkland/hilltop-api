import uuid from "uuid";
import runTest from "../../utils/runTest";
import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  const id = uuid.v1();
  const { steps, puppeteerCode, location, code, cookies } = data;

  const recording = {
    userId: event.requestContext.identity.cognitoIdentityId,
    noteId: id,
    steps,
    puppeteerCode: `${puppeteerCode}`,
    location,
    code,
    cookies,
    createdAt: Date.now()
  };

  const { result } = await runTest({ recording });

  // TODO: better way to detect failure
  if (result.data.error) return failure(result);

  // TODO: make a Recording class
  const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
  recording.nextScheduledTest = expiration;
  recording.isActive = true;

  recording.results = [
    {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      screenshots: result.screenshots
    }
  ];

  const params = {
    TableName: process.env.recordingTableName,
    Item: recording
  };

  try {
    await dynamoDbLib.call("put", params);
    console.info("FINISH");
    return success(params.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
