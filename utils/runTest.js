import AWS from "aws-sdk";
import uuid from "uuid";
import axios from "axios";
import { failure } from "../libs/response-lib";

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

export default async function runTest({ recording: { code, noteId } }) {
  // TODO: this should only run if 'active' is set
  console.log("Starting test run:\n");
  console.info("noteId:\n", noteId);
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
      data: { code }
    });
    console.log("Successfully ran test");
  } catch (e) {
    console.error("Failed to run function:\n");
    console.error(e);
    return failure(e);
  }
  try {
    screenshots = result.data.screenshots.map(({ data }, i) =>
      putObjectToS3({
        bucket: process.env.screenshotsBucket,
        key: `${noteId}-${resultId}-${i}`,
        data
      })
    );

    console.log("Starting to store screenshots:\n");
    console.info(screenshots);
    resolvedScreenshots = await Promise.all(screenshots);
    console.log("Resolved screenshots:\n");
    console.info("SCREENSHOTS:\n", resolvedScreenshots);
    return { result, screenshots: resolvedScreenshots };
  } catch (err) {
    console.error("Failed to store screenshots:\n");
    console.error(err);
    return failure(err);
  }
}
