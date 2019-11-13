import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";

export async function main(event, context) {
  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);

  try {
    user.setActive();
    const createdUser = await user.create();
    return success(createdUser);
  } catch (e) {
    console.error("Failed to create team:\n");
    console.error(e);
    return failure({ status: e });
  }
}
