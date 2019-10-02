import AWS from "aws-sdk";

export async function main(event, context) {
  console.log("event", event);
  event.Records.forEach(({ eventName, dynamodb }) => {
    // const taskToBeRun = AWS.DynamoDB.Converter.unmarshall(dynamodb.OldImage);
    // const insertedTask = AWS.DynamoDB.Converter.unmarshall(dynamodb.NewImage);

    switch (eventName) {
      case "MODIFY":
        console.log(`MODIFY, don't do anything`);
        break;
      case "INSERT":
        console.log(`INSERT, don't do anything`);
        break;
      case "REMOVE":
        console.log(`REMOVE`);
    }
  });

  // try {
  //   await dynamoDbLib.call("put", params);
  //   return success(params.Item);
  // } catch (e) {
  //   console.log("failed to save record", e);
  //   return failure({ status: false });
  // }
}
