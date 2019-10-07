import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  console.log(event);
  const { testCode, runIntervalMinutes = 2, noteId } = data;
  const userId = event.requestContext.identity.cognitoIdentityId;
  // 8 hours
  const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;

  const recordingUpdateParams = {
    TableName: process.env.recordingTableName,
    Key: {
      userId: event.requestContext.identity.cognitoIdentityId,
      noteId
    },
    UpdateExpression: "SET isActive = :isActive",
    ExpressionAttributeValues: {
      ":isActive": true
    }
  };

  try {
    await dynamoDbLib.call("update", recordingUpdateParams);
    console.log("successfully set recording: active");
  } catch (e) {
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
      testCode: `${testCode}`,
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
    console.log("successfully added recording task");
    const recording = await dynamoDbLib.call("get", recordingGetParams);
    return success(recording.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
