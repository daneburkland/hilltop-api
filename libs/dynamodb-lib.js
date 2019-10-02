import AWS from "aws-sdk";

export function call(action, params) {
  const dynamoDb = new AWS.DynamoDB.DocumentClient({
    convertEmptyValues: true
  });

  return dynamoDb[action](params).promise();
}
