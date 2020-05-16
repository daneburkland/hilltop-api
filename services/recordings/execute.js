import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);

  const recording = await Recording.get({
    teamId: user.teamId,
    recordingId: event.pathParameters.id
  });

  try {
    const updatedRecording = await recording.execute();
    return success(updatedRecording);
  } catch (e) {
    console.error("Failed to execute recording:", e);
    return failure({ e });
  }
}
