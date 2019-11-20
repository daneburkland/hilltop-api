import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";

export async function main(event, context) {
  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);

  try {
    const result = await user.getTeam();
    if (result.Items) {
      return success(result.Items);
    } else {
      return failure({ status: false, error: "No Team members." });
    }
  } catch (e) {
    console.error("Failed to get team:\n");
    console.info(e);
    return failure({ status: false });
  }
}
