import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";
import TestRun from "../../classes/TestRun";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  console.log(event);
  const { noteId } = data;
  const userId = event.requestContext.identity.cognitoIdentityId;

  const recording = Recording.from({ userId, noteId });
  const testRun = TestRun.from({ userId, noteId });

  try {
    await recording.updateToInactive();
    console.log("successfully set recording: paused");
  } catch (e) {
    return failure({ status: false });
  }

  try {
    await testRun.updateToInactive();
    console.log("successfully set recording task: paused");
    const updatedRecording = await recording.get();
    return success(updatedRecording.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
