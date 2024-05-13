import inquirer from "inquirer";
import { SelectOptions } from "./types";

export default async function selectAppConfigurations(): Promise<SelectOptions> {
  return new Promise(resolve => {
    inquirer
      .prompt([
        {
          type: "list",
          name: "styleType",
          message: "What style type do you prefer to use?",
          choices: [
            {
              value: "scss",
              name: "Sass (SCSS)",
            },
            {
              value: "styledComponents",
              name: "Styled Components (Emotion JS)",
            },
            {
              value: "all",
              name: "Both",
            },
          ],
        },
      ])
      .then(resolve);
  });
}
