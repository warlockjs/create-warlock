import { colors } from "@mongez/copper";
import inquirer from "inquirer";

export default async function selectAppType() {
  return (
    await inquirer.prompt([
      {
        type: "list",
        name: "appType",
        message: "Please Select Your Application Type",
        choices: [
          {
            value: "react",
            name: colors.cyanBright("React Js"),
          },
          {
            value: "node",
            name: colors.green("Node Js"),
          },
        ],
      },
    ])
  ).appType;
}
