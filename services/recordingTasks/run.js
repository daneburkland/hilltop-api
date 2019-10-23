import AWS from "aws-sdk";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  console.log("event records:", event.Records);
  const recordingsToRun = event.Records.filter(r =>
    ["MODIFY", "INSERT"].includes(r.eventName)
  ).map(async ({ dynamodb }) => {
    const recording = Recording.from(
      AWS.DynamoDB.Converter.unmarshall(dynamodb.NewImage)
    );

    try {
      await recording.execute();
    } catch (error) {
      console.error("Failed to execute Recording:\n");
      console.error(error);
    }
  });

  await Promise.all(recordingsToRun);
}
