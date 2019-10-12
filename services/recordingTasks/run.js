import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";
import runTest from "../../utils/runTest";
import AWS from "aws-sdk";

export async function main(event, context) {
  console.log("event records:", event.Records);
  const recordingsToRun = event.Records.filter(r =>
    ["MODIFY", "INSERT"].includes(r.eventName)
  ).map(async ({ dynamodb }) => {
    const recording = AWS.DynamoDB.Converter.unmarshall(dynamodb.NewImage);

    const { result, screenshots } = await runTest({ recording });

    const params = {
      TableName: process.env.recordingTableName,
      Key: {
        userId: recording.userId,
        noteId: recording.noteId
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
            headers: result.headers,
            screenshots
          }
        ],
        ":empty_list": []
      }
    };

    try {
      console.log("trying to save");
      await dynamoDbLib.call("update", params);
      console.log("successful save");
      return success({ status: true });
    } catch (e) {
      console.log("failure", e);
      return failure({ status: false });
    }
  });

  await Promise.all(recordingsToRun);
}
