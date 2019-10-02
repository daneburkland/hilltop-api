import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  const { testCode, runIntervalMinutes = 2, noteId } = data;
  const expiration = Math.floor(Date.now() / 1000) + 15;

  const params = {
    TableName: process.env.recordingTaskTableName,
    Item: {
      noteId,
      expiration,
      runIntervalMinutes,
      testCode: `${testCode}`,
      createdAt: Date.now()
    }
  };

  try {
    await dynamoDbLib.call("put", params);
    return success(params.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
