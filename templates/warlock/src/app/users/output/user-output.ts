import { Output, type FinalOutput } from "@warlock.js/core";
import { withBaseOutputDetails } from "app/utils/output";

export default class UserOutput extends Output {
  /**
   * Output data
   */
  protected output: FinalOutput = withBaseOutputDetails({
    name: "string",
    email: "string",
  });
}
