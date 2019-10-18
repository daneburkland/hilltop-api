import { success, failure } from "../../libs/response-lib";
import Recording from "../../classes/Recording";

export async function main(event, context) {
  const data = JSON.parse(event.body);

  const recording = new Recording({
    ...data,
    userId: event.requestContext.identity.cognitoIdentityId
  });

  const { result } = await recording.runTest();

  // TODO: better way to detect failure
  if (result.data.error) return failure(result);

  recording.results = [
    {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      screenshots: result.screenshots
    }
  ];

  try {
    await recording.create();
    console.info("FINISH");
    return success(recording);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
