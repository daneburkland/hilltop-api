import { success, failure } from "../../libs/response-lib";
import TestRun from "../../classes/TestRun";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  const data = JSON.parse(event.body);

  const testRun = new TestRun({
    ...data,
    userId: event.requestContext.identity.cognitoIdentityId
  });

  const { expiration, userId, noteId } = testRun;

  const recording = Recording.from({ expiration, userId, noteId });

  try {
    await recording.updateToActive();
    console.log("Sucessfully updated recording:\n");
    console.info(`noteId: ${recording.noteId}`);
  } catch (e) {
    console.error("Failed to update recording:\n");
    console.error(e);
    return failure({ status: false });
  }

  try {
    await testRun.create();
    console.log("Successfull added recording task for noteId:");
    console.info(`noteId: ${testRun.noteId}`);
    const updatedRecording = await recording.get();
    console.log("Successfully retrieved recording:\n");
    console.info(`noteId: ${updatedRecording.noteId}`);
    return success(updatedRecording.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
