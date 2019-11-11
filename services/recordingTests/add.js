import { success, failure } from "../../libs/response-lib";
import TestRun from "../../classes/TestRun";
import Recording from "../../classes/Recording";
import User from "../../classes/User";

export async function main(event, context) {
  const data = JSON.parse(event.body);

  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);
  const testRun = new TestRun({
    ...data,
    teamId: user.teamId
  });

  const { expiration, teamId, recordingId } = testRun;

  const recording = Recording.from({ expiration, teamId, recordingId });

  try {
    await recording.updateToActive();
  } catch (e) {
    console.error("Failed to update recording:\n");
    console.error(e);
    return failure({ status: false });
  }

  try {
    await testRun.create();
    const updatedRecording = await recording.get();
    return success(updatedRecording.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
