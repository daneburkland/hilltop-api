import { success, failure } from "../../libs/response-lib";
import AuthFlow from "../../classes/AuthFlow";
import User from "../../classes/User";

export async function main(event, context) {
  const authProvider =
    event.requestContext.identity.cognitoAuthenticationProvider;
  const user = await User.fetchFromAuthProvider(authProvider);

  const authFlow = AuthFlow.from({
    teamId: user.teamId,
    origin: event.queryStringParameters.origin
  });

  try {
    const result = await authFlow.get();
    return success(result);
  } catch (e) {
    console.error("Failed to get recording:\n");
    console.info(e);
    return failure({ status: false });
  }
}
