import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";
import TestRun from "../../classes/TestRun";
import User from "../../classes/User";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  const { recordingId } = data;
  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);

  const recording = Recording.from({ teamId: user.teamId, recordingId });
  const testRun = TestRun.from({ teamId: user.teamId, recordingId });

  try {
    await recording.updateToInactive();
  } catch (e) {
    return failure({ status: false });
  }

  try {
    await testRun.updateToInactive();
    const updatedRecording = await recording.get();
    return success(updatedRecording.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
