import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  console.log(event);
  const { noteId } = data;

  const recordingParams = {
    TableName: process.env.recordingTableName,
    Key: {
      userId: event.requestContext.identity.cognitoIdentityId,
      noteId
    },
    UpdateExpression:
      "SET isActive = :isActive, nextScheduledTest = :nextScheduledTest",
    ExpressionAttributeValues: {
      ":isActive": false,
      ":nextScheduledTest": null
    }
  };

  try {
    await dynamoDbLib.call("update", recordingParams);
    console.log("successfully set recording: paused");
  } catch (e) {
    return failure({ status: false });
  }

  const recordingTaskParams = {
    TableName: process.env.recordingTaskTableName,
    Key: {
      userId: event.requestContext.identity.cognitoIdentityId,
      noteId
    },
    UpdateExpression: "SET isActive = :isActive",
    ExpressionAttributeValues: {
      ":isActive": false
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
    await dynamoDbLib.call("update", recordingTaskParams);
    console.log("successfully set recording task: paused");
    const recording = await dynamoDbLib.call("get", recordingGetParams);
    return success(recording.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
