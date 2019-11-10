import Recording from "../classes/Recording";
import TestRunResult from "../classes/TestRunResult";
import uuid from "uuid";
import axios from "axios";
import * as dynamoDbLib from "../libs/dynamodb-lib";

jest.mock("../libs/dynamodb-lib");
jest.mock("axios");
// jest.mock("../classes/TestRunResult");

beforeEach(() => {
  dynamoDbLib.call.mockClear();
  axios.mockClear();
});

describe("constructor", () => {
  const json = {
    userId: uuid.v1(),
    steps: ["foo", "bar"],
    location: { foo: "bar" },
    code: `test test`,
    cookies: ["coo", "kie"],
    isAuthFlow: false,

    // shouldn't construct with:
    noteId: undefined,
    createdAt: undefined,
    results: undefined,
    nextScheduledTest: undefined
  };
  const recording = new Recording(json);

  test("returns correct instance", () => {
    expect(recording).toBeInstanceOf(Recording);
  });

  test("constructs with correct user supplied properties", () => {
    expect(recording).toHaveProperty("code", json.code);
    expect(recording).toHaveProperty("cookies", json.cookies);
    expect(recording).toHaveProperty("debugCode", json.debugCode);
    expect(recording).toHaveProperty("isAuthFlow", json.isAuthFlow);
    expect(recording).toHaveProperty("location", json.location);
    expect(recording).toHaveProperty("steps", json.steps);
    expect(recording).toHaveProperty("userId", json.userId);
  });

  test("doesn't set user supplied values for automatically set properties", () => {
    expect(recording.noteId).toBeDefined();
    expect(recording.createdAt).toBeDefined();
    expect(recording.results).toBeDefined();
    expect(recording.nextScheduledTest).toBeDefined();
  });
});

describe("#from", () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const json = {
    noteId: uuid.v1(),
    userId: uuid.v1(),
    results: ["foo", "bar"],
    createdAt: date,
    nextScheduledTest: new Date(),
    isActive: false
  };

  const recording = Recording.from(json);
  test("returns an instance", () => {
    expect(recording).toBeInstanceOf(Recording);
  });

  test("returns correct properties", () => {
    expect(recording).toEqual({
      authedCookies: null,
      code: undefined,
      cookies: undefined,
      createdAt: date,
      debugCode: undefined,
      isActive: json.isActive,
      isAuthFlow: undefined,
      location: undefined,
      nextScheduledTest: json.nextScheduledTest,
      noteId: json.noteId,
      results: json.results,
      steps: undefined,
      userId: json.userId
    });
  });
});

describe("#updateNextScheduledTest", () => {
  const json = {
    noteId: uuid.v1(),
    userId: uuid.v1()
  };
  const recording = new Recording(json);

  test("called with correct params", () => {
    recording.updateNextScheduledTest();
    expect(dynamoDbLib.call).toHaveBeenCalledWith("update", {
      ExpressionAttributeValues: {
        ":nextScheduledTest": recording.nextScheduledTest
      },
      Key: {
        noteId: recording.noteId,
        userId: recording.userId
      },
      TableName: undefined,
      UpdateExpression: "SET nextScheduledTest = :nextScheduledTest"
    });
  });
});

describe("#query", () => {
  Recording.query({ userId: "foo" });
  expect(dynamoDbLib.call).toHaveBeenCalledWith("query", {
    ExpressionAttributeValues: { ":userId": "foo" },
    KeyConditionExpression: "userId = :userId",
    TableName: undefined
  });
});

describe("#get", () => {
  const json = {
    userId: uuid.v1()
  };
  const recording = new Recording(json);
  recording.get();
  expect(dynamoDbLib.call).toHaveBeenCalledWith("get", {
    Key: {
      noteId: recording.noteId,
      userId: recording.userId
    },
    TableName: undefined
  });
});

describe("#execute", () => {
  const json = {
    userId: uuid.v1(),
    location: {}
  };
  let recording = new Recording(json);
  const axiosResponse = {
    data: { error: null, stepResults: [], authedCookies: ["authed", "cookies"] }
  };
  axios.mockResolvedValue(axiosResponse);

  const mockedUpdateCookies = jest.fn();
  Recording.prototype._updateCookies = mockedUpdateCookies;

  const mockedAddResult = jest.fn();
  Recording.prototype._addResult = mockedAddResult;

  const mockedUpdateAuthFlow = jest.fn();
  Recording.prototype._updateAuthFlow = mockedUpdateAuthFlow;

  const mockedTestRunResult = new TestRunResult({
    error: null,
    authedCookies: ["authed", "cookies"],
    stepResults: []
  });
  const mockedBuildTestRunResult = jest.fn();
  TestRunResult.build = mockedBuildTestRunResult;
  mockedBuildTestRunResult.mockResolvedValue(mockedTestRunResult);

  const mockedTestRunResultFrom = jest.fn();
  TestRunResult.from = mockedTestRunResultFrom;
  mockedTestRunResultFrom.mockResolvedValue(mockedTestRunResultFrom);

  beforeEach(() => {
    Recording.prototype._updateCookies.mockClear();
    Recording.prototype._addResult.mockClear();
    Recording.prototype._updateAuthFlow.mockClear();
    TestRunResult.build.mockClear();
    TestRunResult.from.mockClear();
  });

  test("if the recording !isAuthFlow", async () => {
    recording = new Recording({ isAuthFlow: false });
    expect(recording.isAuthFlow).toBeFalsy();
    await recording.execute();
    expect(recording._updateCookies).toHaveBeenCalled();
  });

  test("if the recording isAuthFlow", async () => {
    recording = new Recording({ isAuthFlow: true });
    expect(recording.isAuthFlow).toBeTruthy();
    await recording.execute();
    expect(recording._updateCookies).not.toHaveBeenCalled();
  });

  describe("chrome api call", () => {
    test("gets called with authCookies if present", async () => {
      recording = new Recording();
      recording.authedCookies = ["auth", "cookies"];
      await recording.execute();
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            code: undefined,
            context: { cookies: recording.authedCookies }
          }
        })
      );
    });

    test("gets called with code", async () => {
      recording = new Recording({ code: "some sick code" });
      await recording.execute();
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            code: recording.code,
            context: { cookies: recording.cookies }
          }
        })
      );
    });

    test("builds a TestRunResult", async () => {
      recording = new Recording();
      await recording.execute();
      expect(TestRunResult.build).toHaveBeenCalledWith(axiosResponse);
    });

    test("builds a TestRunResult with correct error when axios call errors", async () => {
      recording = new Recording();
      const error = { data: "it broke" };
      axios.mockImplementationOnce(() => {
        throw new Error(error);
      });
      await recording.execute();
      expect(TestRunResult.from).toHaveBeenCalledWith({
        data: { error: undefined }
      });
    });
  });

  test("calls _addResult", async () => {
    recording = new Recording();
    await recording.execute();
    expect(recording._addResult).toHaveBeenCalledWith(mockedTestRunResult);
  });

  describe("if it is an auth flow", () => {
    beforeEach(async () => {
      Recording.prototype._updateAuthFlow.mockClear();
      recording = new Recording({
        userId: uuid.v1(),
        isAuthFlow: true
      });
      await recording.execute();
    });

    test("it calls _updateAuthFlow", () => {
      expect(recording._updateAuthFlow).toHaveBeenCalledWith(
        mockedTestRunResult
      );
    });

    test("it sets authedCookies", () => {
      expect(recording.authedCookies).toEqual(["authed", "cookies"]);
    });
  });

  describe("if it is not an auth flow", () => {
    beforeEach(async () => {
      Recording.prototype._updateAuthFlow.mockClear();
      recording = new Recording({
        userId: uuid.v1(),
        isAuthFlow: false
      });
      await recording.execute();
    });

    test("it does not call _updateAuthFlow", () => {
      expect(recording._updateAuthFlow).not.toHaveBeenCalled();
    });

    test("it does not set authedCookies", () => {
      expect(recording.authedCookies).toEqual(null);
    });
  });
});
