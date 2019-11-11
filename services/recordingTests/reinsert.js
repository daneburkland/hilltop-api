import { success, failure } from "../../libs/response-lib";
import AWS from "aws-sdk";
import TestRun from "../../classes/TestRun";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  const removedRecords = event.Records.filter(r =>
    ["REMOVE"].includes(r.eventName)
  ).map(async ({ dynamodb }) => {
    const recording = AWS.DynamoDB.Converter.unmarshall(dynamodb.OldImage);

    // Reinsert the recording if it's active
    if (recording.isActive) {
      const testRun = new TestRun({ ...recording });
      const recording = new Recording({ ...recording });

      try {
        await recording.updateNextScheduledtest();
      } catch (e) {
        console.error("Failed to update recording:\n");
        console.error(e);
        return failure({ status: false });
      }

      try {
        await testRun.reinsert();
        return success({ status: true });
      } catch (e) {
        console.error("failed to re-insert recording", e);
        return failure({ status: false });
      }
    }

    return success({ status: "OK. Recording not re-inserted" });
  });

  await Promise.all(removedRecords);
}
