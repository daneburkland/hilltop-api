import uuid from "uuid";
import * as dynamoDbLib from "../../libs/dynamodb-lib";
import { success, failure } from "../../libs/response-lib";

// function removeEmptyStringElements(obj) {
//   for (var prop in obj) {
//     if (typeof obj[prop] === "object") {
//       // dive deeper in
//       removeEmptyStringElements(obj[prop]);
//     } else if (obj[prop] === "") {
//       // delete elements that are empty strings
//       delete obj[prop];
//     }
//   }
//   return obj;
// }

export async function main(event, context) {
  const data = JSON.parse(event.body);
  const id = uuid.v1();
  const { steps, puppeteerCode, location, testCode } = data;
  const params = {
    TableName: process.env.recordingTableName,
    Item: {
      userId: event.requestContext.identity.cognitoIdentityId,
      noteId: id,
      steps,
      puppeteerCode: `${puppeteerCode}`,
      location,
      testCode,
      createdAt: Date.now()
    }
  };

  try {
    await dynamoDbLib.call("put", params);
    return success(params.Item);
  } catch (e) {
    console.log("failed to save record", e);
    return failure({ status: false });
  }
}
