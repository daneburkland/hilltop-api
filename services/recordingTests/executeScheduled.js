import AWS from "aws-sdk";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  const recordingsToRun = event.Records.filter(r =>
    ["MODIFY", "INSERT"].includes(r.eventName)
  ).map(async ({ dynamodb }) => {
    const recording = Recording.from(
      AWS.DynamoDB.Converter.unmarshall(dynamodb.NewImage)
    );

    try {
      // TODO: why is this on recording? this is a TestRun
      await recording.execute();
    } catch (error) {
      console.error("Failed to execute Recording:\n");
      console.error(error);
    }
  });

  await Promise.all(recordingsToRun);
}
