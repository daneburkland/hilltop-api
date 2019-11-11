import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";
import User from "../../classes/User";

export async function main(event, context) {
  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);
  try {
    const result = await Recording.query({
      teamId: user.teamId
    });
    // Return the matching list of items in response body
    return success(result.Items);
  } catch (e) {
    return failure({ status: false });
  }
}
