import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";

export async function main(event, context) {
  const data = JSON.parse(event.body);

  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);
  const params = {
    TableName: process.env.userSettingsTableName,
    Key: {
      teamId: user.teamId
    },
    UpdateExpression: "SET captureSessionData = :captureSessionData",
    ExpressionAttributeValues: {
      ":captureSessionData": data.captureSessionData || null
    },

    ReturnValues: "ALL_NEW"
  };

  try {
    await dynamoDbLib.call("update", params);
    return success({ status: true });
  } catch (e) {
    return failure({ status: false });
  }
}
