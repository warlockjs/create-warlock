import inquirer from "inquirer";

export default async function selectReactAppType(): Promise<{
  type: "basic" | "mantine";
}> {
  return new Promise(resolve => {
    inquirer
      .prompt([
        {
          type: "list",
          name: "type",
          message: "Please select your React app type?",
          choices: [
            {
              value: "basic",
              name: "Headless UI (TS + Vite + Mongez)",
            },
            {
              value: "tailwind",
              name: "Tailwind CSS (TS + Vite + Mongez)",
            },
            // {
            //   value: "mantine",
            //   name: "VinoTine (Vite + Typescript + Moonlight + Mantine UI + Mongez)",
            // },
          ],
        },
      ])
      .then(resolve);
  });
}
