import { colors } from "@mongez/copper";
import { isDirectory } from "@mongez/fs";
import * as path from "path";

export default function getAppPath(appName: string) {
  const appPath: string = path.resolve(process.cwd(), appName);

  if (isDirectory(appPath)) {
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
