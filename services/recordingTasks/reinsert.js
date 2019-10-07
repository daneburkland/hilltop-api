import { success, failure } from "../../libs/response-lib";
import AWS from "aws-sdk";
import * as dynamoDbLib from "../../libs/dynamodb-lib";

export async function main(event, context) {
  console.log("event", event);
  const removedRecords = event.Records.filter(r =>
    ["REMOVE"].includes(r.eventName)
  ).map(async ({ dynamodb }) => {
    const recording = AWS.DynamoDB.Converter.unmarshall(dynamodb.OldImage);
    console.log("recording", recording);

    // Reinsert the recording if it's active
    if (recording.isActive) {
      const params = {
        TableName: process.env.recordingTaskTableName,
        Item: {
          ...recording,
          expiration: Math.floor(Date.now() / 1000) + 60 * 60 * 8
        }
      };

      try {
        await dynamoDbLib.call("put", params);
        console.log("successfully re-inserted recording task");
        return success({ status: true });
      } catch (e) {
        console.log("failed to re-insert recording", e);
        return failure({ status: false });
      }
    }

    return success({ status: "OK. Recording not re-inserted" });
  });

  await Promise.all(removedRecords);
}
