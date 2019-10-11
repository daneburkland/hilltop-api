import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";
import axios from "axios";
import AWS from "aws-sdk";
import uuid from "uuid";

async function putObjectToS3({ key, data, bucket }) {
  var s3 = new AWS.S3();
  var params = {
    // TODO: this should prob be 'authenticated-read'?
    ACL: "public-read-write",
    Bucket: bucket,
    Key: `public/${key}`,
    Body: new Buffer(data)
  };
  await s3.putObject(params).promise();
  return { bucket, key };
}

export async function main(event, context) {
  console.log("event records:", event.Records);
  const recordingsToRun = event.Records.filter(r =>
    ["MODIFY", "INSERT"].includes(r.eventName)
  ).map(async ({ dynamodb }) => {
    const recording = AWS.DynamoDB.Converter.unmarshall(dynamodb.NewImage);
    const code = recording.testCode;

    // TODO: this should only run if 'active' is set
    let result, screenshots, resolvedScreenshots;
    const resultId = uuid.v1();
    try {
      console.log("trying to run function:", recording);
      result = await axios({
        method: "POST",
        url: `${process.env.hilltopChromeUrl}/function`,
        mode: "no-cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json"
        },
        data: { code }
      });
      console.log("ran function");
      screenshots = result.data.screenshots.map(({ data }, i) =>
        putObjectToS3({
          bucket: process.env.screenshotsBucket,
          key: `${recording.noteId}-${resultId}-${i}`,
          data
        })
      );

      resolvedScreenshots = await Promise.all(screenshots);
      console.log("screenshots", resolvedScreenshots);
    } catch (err) {
      console.log("save error", err);
      result = err;
    }

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
            screenshots: resolvedScreenshots
          }
        ],
        ":empty_list": []
      }
    };

    console.log("params defined");

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
