import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";
import User from "../../classes/User";

export async function main(event, context) {
  const {
    cognitoAuthenticationProvider: authProvider
  } = event.requestContext.identity;
  const user = await User.fetchFromAuthProvider(authProvider);
  const params = {
    TableName: process.env.recordingTableName,
    // 'Key' defines the partition key and sort key of the item to be removed
    // - 'userId': Identity Pool identity id of the authenticated user
    // - 'recordingId': path parameter
    Key: {
      teamId: user.teamId,
      recordingId: event.pathParameters.id
    }
  };

  try {
    await dynamoDbLib.call("delete", params);
    return success({ status: true });
  } catch (e) {
    return failure({ status: false });
  }
}
