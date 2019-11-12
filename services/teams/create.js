import { success, failure } from "../../libs/response-lib";
import Team from "../../classes/Team";
import User from "../../classes/User";

export async function main(event, context) {
  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);

  const team = new Team({
    teamId: user.teamId
  });

  try {
    await team.create();
    return success(team);
  } catch (e) {
    console.error("Failed to create team:\n");
    console.error(e);
    return failure({ status: false });
  }
}
