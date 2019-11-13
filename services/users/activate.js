import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";

export async function main(event, context) {
  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);

  try {
    const updatedUser = await user.activate();
    return success(updatedUser);
  } catch (e) {
    console.error("Failed to update user:", e);
    return failure({ status: e });
  }
}
