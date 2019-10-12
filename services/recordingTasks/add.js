import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  const { code, runIntervalMinutes = 2, noteId } = data;
  const userId = event.requestContext.identity.cognitoIdentityId;
  // 8 hours
  const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;

  const recordingUpdateParams = {
    TableName: process.env.recordingTableName,
    Key: {
      userId: event.requestContext.identity.cognitoIdentityId,
      noteId
    },
    UpdateExpression:
      "SET isActive = :isActive, nextScheduledTest = :nextScheduledTest",
    ExpressionAttributeValues: {
      ":isActive": true,
      ":nextScheduledTest": expiration
    }
  };

  try {
    await dynamoDbLib.call("update", recordingUpdateParams);
    console.log("Sucessfully updated recording:\n");
    console.info(`noteId: ${noteId}`);
  } catch (e) {
    console.error("Failed to update recording:\n");
    console.error(e);
    return failure({ status: false });
  }

  const recordingTaskParams = {
    TableName: process.env.recordingTaskTableName,
    Item: {
      userId,
      noteId,
      expiration,
      runIntervalMinutes,
      isActive: true,
      code: `${code}`,
      createdAt: Date.now()
    }
  };

  const recordingGetParams = {
    TableName: process.env.recordingTableName,
    Key: {
      userId: event.requestContext.identity.cognitoIdentityId,
      noteId
    }
  };

  try {
    await dynamoDbLib.call("put", recordingTaskParams);
    console.log("Successfull added recording task for noteId:");
    console.info(`noteId: ${noteId}`);
    const recording = await dynamoDbLib.call("get", recordingGetParams);
    console.log("Successfully retrieved recording:\n");
    console.info(`noteId: ${noteId}`);
    return success(recording.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
