import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";
import TestRun from "../../classes/TestRun";
import User from "../../classes/User";

export async function main(event, context) {
  const data = JSON.parse(event.body);

  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);

  const recording = new Recording({
    ...data,
    ownerId: user.id,
    teamId: user.teamId
  });

  const testRun = new TestRun({
    ...recording
  });

  try {
    await testRun.create();
  } catch (e) {
    console.error("Failed to add recording task:\n");
    console.error(e);
  }

  try {
    await recording.create();
    return success(recording);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
