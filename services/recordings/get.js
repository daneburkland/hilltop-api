import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";
import User from "../../classes/User";

export async function main(event, context) {
  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);
  const recording = Recording.from({
    teamId: user.teamId,
    recordingId: event.pathParameters.id
  });

  try {
    const result = await recording.get();
    if (result.Item) {
      // Return the retrieved item
      return success(result.Item);
    } else {
      return failure({ status: false, error: "Item not found." });
    }
  } catch (e) {
    console.error("Failed to get recording:\n");
    console.info(e);
    return failure({ status: false });
  }
}
