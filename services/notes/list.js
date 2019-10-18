import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  try {
    const result = await Recording.query({
      userId: event.requestContext.identity.cognitoIdentityId
    });
    // Return the matching list of items in response body
    return success(result.Items);
  } catch (e) {
    return failure({ status: false });
  }
}
