import { success, failure } from "../../libs/response-lib";
import AWS from "aws-sdk";
import * as dynamoDbLib from "../../libs/dynamodb-lib";

export async function main(event, context) {
  const removedRecords = event.Records.filter(r =>
    ["REMOVE"].includes(r.eventName)
  ).map(async ({ dynamodb }) => {
    const recording = AWS.DynamoDB.Converter.unmarshall(dynamodb.OldImage);
    console.log("Starting reinsert of recording:\n");
    console.info("RECORDING:\n");
    console.info(recording);

    // Reinsert the recording if it's active
    if (recording.isActive) {
      console.log("Recording isActive, starting reinsert of recording\n");

      // 8 hours
      const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
      const recordingTaskParams = {
        TableName: process.env.recordingTaskTableName,
        Item: {
          ...recording,
          expiration
        }
      };

      console.log("Updating nextScheduledTest of recording\n");
      const recordingUpdateParams = {
        TableName: process.env.recordingTableName,
        Key: {
          userId: recording.userId,
          noteId: recording.noteId
        },
        UpdateExpression: "SET nextScheduledTest = :nextScheduledTest",
        ExpressionAttributeValues: {
          ":nextScheduledTest": expiration
        }
      };

      try {
        await dynamoDbLib.call("update", recordingUpdateParams);
        console.log("Sucessfully updated recording:\n");
      } catch (e) {
        console.error("Failed to update recording:\n");
        console.error(e);
        return failure({ status: false });
      }

      try {
        await dynamoDbLib.call("put", recordingTaskParams);
        console.log("Successfully re-inserted recording task");
        return success({ status: true });
      } catch (e) {
        console.error("failed to re-insert recording", e);
        return failure({ status: false });
      }
    }

    console.log("Recording inactive. Not reinserted\n");
    return success({ status: "OK. Recording not re-inserted" });
  });

  await Promise.all(removedRecords);
}
