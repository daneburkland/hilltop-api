import AWS from "aws-sdk";

export async function putObjectToS3({ key, data, bucket }) {
  var s3 = new AWS.S3();
  var params = {
    // TODO: this should prob be 'authenticated-read'?
    ACL: "public-read-write",
    Bucket: bucket,
    Key: `public/${key}`,
    Body: Buffer.from(data)
  };
  await s3.putObject(params).promise();
  return { bucket, key };
}
