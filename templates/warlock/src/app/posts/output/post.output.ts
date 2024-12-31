import { type FinalOutput, Output } from "@warlock.js/core";

export class PostOutput extends Output {
  /**
   * {@inheritdoc}
   */
  protected output: FinalOutput = {
    id: "int",
    title: "string",
    content: "string",
    createdAt: "date",
  };
}
