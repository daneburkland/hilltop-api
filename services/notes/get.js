import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  const recording = Recording.from({
    userId: event.requestContext.identity.cognitoIdentityId,
    noteId: event.pathParameters.id
  });

  console.log(event.requestContext);
  console.log(event.pathParameters);
  console.log(recording);
  console.log(recording.noteId);
  console.log(recording.userId);

  try {
    const result = await recording.get();
    console.log("Successfully fetched recording:\n");
    console.info(result);
    if (result.Item) {
      // Return the retrieved item
      return success(result.Item);
    } else {
      return failure({ status: false, error: "Item not found." });
    }
  } catch (e) {
    console.error("Failed to get recording:\n");
    console.info(e);
    return failure({ status: false });
  }
}
