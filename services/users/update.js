import { success } from "../../libs/response-lib";
import User from "../../classes/User";

export async function main(event, context) {
  const data = JSON.parse(event.body);

  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);

  try {
    const updatedUser = await user.update({ data });
    return success(updatedUser);
  } catch (e) {
    console.error("Failed to update user:", e);
  }
}
