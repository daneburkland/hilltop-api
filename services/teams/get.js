import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";
import Team from "../../classes/Team";

export async function main(event, context) {
  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);
  const team = new Team({
    teamId: user.teamId
  });

  try {
    const result = await team.get();
    if (result.Item) {
      // Return the retrieved item
      return success(result.Item);
    } else {
      return failure({ status: false, error: "Item not found." });
    }
  } catch (e) {
    console.error("Failed to get team:\n");
    console.info(e);
    return failure({ status: false });
  }
}
