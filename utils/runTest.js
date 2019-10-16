import AWS from "aws-sdk";
import uuid from "uuid";
import axios from "axios";

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

export default async function runTest({
  recording: { code, noteId, cookies }
}) {
  // TODO: this should only run if 'active' is set
  console.log("Starting test run:\n");
  console.info("noteId:\n", noteId);
  console.info("code:\n", code);
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
      timeout: 15000,
      data: { code, context: { cookies } }
    });
    if (result.data.error) {
      console.log("Failed to run test");
      console.info("ERROR:\n");
      console.info(result.data.error);
      return { result };
    }
    console.log("Successfully ran test");
    console.info("RESULT:\n");
    console.info(result);
  } catch (err) {
    console.error("Failed to run function:\n");
    console.error(err);
    return err;
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
    resolvedScreenshots = await Promise.all(screenshots);
    console.log("Resolved screenshots:\n");
    console.info("SCREENSHOTS:\n", resolvedScreenshots);
    result.screenshots = resolvedScreenshots;
    return { result };
  } catch (err) {
    console.error("Failed to store screenshots:\n");
    console.error(err);
    return err;
  }
}
