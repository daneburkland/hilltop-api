import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";
import TestRun from "../../classes/TestRun";

export async function main(event, context) {
  const data = JSON.parse(event.body);

  const userId = event.requestContext.identity.cognitoIdentityId;

  const recording = new Recording({
    ...data,
    userId
  });

  const testRun = new TestRun({
    ...recording
  });

  try {
    await testRun.create();
    console.log("Successfully added recording task for noteId:\n");
    console.info(`noteId: ${testRun.noteId}`);
  } catch (e) {
    console.error("Failed to add recording task:\n");
    console.error(e);
  }

  try {
    await recording.create();
    console.log("Successfully created recording:\n");
    console.info("FINISH");
    return success(recording);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
