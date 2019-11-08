import { putObjectToS3 } from "../libs/s3-lib";
import uuid from "uuid";

class StepResult {
  constructor(resolvedParams) {
    if (typeof resolvedParams === "undefined") {
      throw new Error("Cannot be called directly");
    }

    this.pageScreenshot = resolvedParams.pageScreenshot;
    this.elementScreenshot = resolvedParams.elementScreenshot;
    this.id = resolvedParams.id;
    this.isOk = resolvedParams.isOk;
  }

  static async build(
    { isOk, pageScreenshot, elementScreenshot, id } = {},
    resultId
  ) {
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
      isOk
    });
  }
}

export default class TestRunResult {
  constructor(resolvedParams) {
    if (typeof resolvedParams === "undefined") {
      throw new Error("Cannot be called directly");
    }

    this.error = resolvedParams.error;
    this.stepResults = resolvedParams.stepResults;
  }

  static async build({ data }) {
    const id = uuid.v1();
    const resolvedStepResults = {};
    await Promise.all(
      Object.keys(data.stepResults).map(async stepId => {
        resolvedStepResults[stepId] = await StepResult.build(
          data.stepResults[stepId],
          id
        );
      })
    );
    return new TestRunResult({
      error: data.error,
      stepResults: resolvedStepResults
    });
  }

  static async from(json) {
    return Object.assign(new TestRunResult(), json);
  }
}
