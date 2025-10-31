import { Output, type FinalOutput } from "@warlock.js/core";
import { withBaseOutputDetails } from "app/utils/output";

export class PostOutput extends Output {
  /**
   * {@inheritdoc}
   */
  protected output: FinalOutput = withBaseOutputDetails({
    title: "string",
    content: "string",
  });
}
