import { putObjectToS3 } from "../libs/s3-lib";
import { debug } from "../utils";

const tracingDebug = debug("Tracing");
tracingDebug.enabled = true;

export default class Tracing {
  constructor({ data } = {}) {
    this.data = data;
  }

  async store({ resultId }) {
    tracingDebug(`#store`);
    await putObjectToS3({
      bucket: process.env.tracingBucket,
      key: `${resultId}-tracing`,
      data: this.data
    });
  }
}
