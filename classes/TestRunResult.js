import { putObjectToS3 } from "../libs/s3-lib";
import uuid from "uuid";
import { debug } from "../utils";
import Tracing from "./Tracing";

const testRunResultDebug = debug("TestRunResult");
testRunResultDebug.enabled = true;
const stepResultDebug = debug("StepResult");
stepResultDebug.enabled = true;

class StepResult {
  constructor(resolvedParams = {}) {
    this.pageScreenshot = resolvedParams.pageScreenshot;
    this.elementScreenshot = resolvedParams.elementScreenshot;
    this.id = resolvedParams.id;
    this.isOk = resolvedParams.isOk;
    this.error = resolvedParams.error;
  }

  static async build(
    { isOk, pageScreenshot, elementScreenshot, id } = {},
    resultId,
    error
  ) {
    stepResultDebug(`#build`);
    const resolvedPageScreenshot =
      pageScreenshot &&
      (await putObjectToS3({
        bucket: process.env.screenshotsBucket,
        key: `${id}-${resultId}-page`,
        data: pageScreenshot
      }));

    const resolvedElementScreenshot =
      elementScreenshot &&
      (await putObjectToS3({
        bucket: process.env.screenshotsBucket,
        key: `${id}-${resultId}-element`,
        data: elementScreenshot
      }));

    return new StepResult({
      pageScreenshot: resolvedPageScreenshot,
      elementScreenshot: resolvedElementScreenshot,
      id,
      isOk,
      error: isOk ? null : error
    });
  }
}

export default class TestRunResult {
  constructor(resolvedParams = {}) {
    this.error = resolvedParams.error;
    this.stepResults = resolvedParams.stepResults;
    this.authedCookies = resolvedParams.authedCookies;
    this.tracing = resolvedParams.tracing;
    this.measurements = resolvedParams.measurements;
    this.createdAt = new Date();
  }

  static async build({ data }) {
    testRunResultDebug(`#build: %o`, data);
    const id = uuid.v1();
    const resolvedStepResults = {};

    const tracing = new Tracing({ data: data.tracing });
    const resolvedTracing = await tracing.store({ resultId: id });

    await Promise.all(
      Object.keys(data.stepResults).map(async stepId => {
        resolvedStepResults[stepId] = await StepResult.build(
          data.stepResults[stepId],
          id,
          data.error
        );
      })
    );

    return new TestRunResult({
      error: data.error,
      authedCookies: data.authedCookies,
      measurements: data.measurements,
      stepResults: resolvedStepResults,
      tracing: resolvedTracing
    });
  }

  static from(json) {
    testRunResultDebug(`#from: %o`, json);
    return Object.assign(new TestRunResult(), json);
  }
}
