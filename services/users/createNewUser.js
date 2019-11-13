import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";

export async function main(event, context) {
  const data = JSON.parse(event.body);
  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);

  try {
    const invitedUser = await user.createNewUser({ email: data.email });
    return success(invitedUser);
  } catch (e) {
    console.error("Failed to create team user:\n");
    console.error(e);
    return failure({ status: false });
  }
}
