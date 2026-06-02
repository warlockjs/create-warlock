import { colors } from "@mongez/copper";
import { directoryExists } from "@warlock.js/fs";
import * as path from "path";

export default function getAppPath(appName: string) {
  const appPath: string = path.resolve(process.cwd(), appName);

  if (directoryExists(appPath)) {
    console.log(
      colors.redBright(
        `${process.cwd()} has an existing directory \`${colors.cyan(
          appName,
        )}\`, please choose another app name or another directory to run the command from.`,
      ),
    );

    process.exit(1);
  }

  return appPath;
}
