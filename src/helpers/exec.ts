import { log } from "@clack/prompts";
import { colors } from "@mongez/copper";
import { ChildProcess } from "child_process";
import { default as childProcess, default as spawn } from "cross-spawn";

export default async function exec(command: string, options: any = {}) {
  const [commandName, ...optionsList] = command.split(" ");

  const commandOutput = childProcess.sync(commandName, optionsList, options);

  // it means command didn't end as expected, then stop the rest of the program
  if (commandOutput.error !== null) {
    process.exit(1);
  }

  return commandOutput;
}

/**
 * This function directly executes a command
 */
export async function executeCommand(cmd: string, args: string[], cwd: string) {
  return new Promise<boolean>(resolve => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: "ignore",
    });

    child.on("error", e => {
      if (e) {
        if (e.message) {
          log.error(colors.red(String(e.message)) + `\n\n`);
        } else {
          log.error(colors.red(String(e)) + `\n\n`);
        }
      }
      resolve(false);
    });

    child.on("close", code => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

export function runCommand(cmd: string, args: string[], cwd: string) {
  let child: ChildProcess;

  const install = new Promise<boolean>(resolve => {
    try {
      child = spawn(cmd, args, {
        cwd,
        stdio: "ignore",
      });

      child.on("error", e => {
        if (e) {
          if (e.message) {
            log.error(colors.red(String(e.message)) + `\n\n`);
          } else {
            log.error(colors.red(String(e)) + `\n\n`);
          }
        }
        resolve(false);
      });

      child.on("close", code => {
        if (code === 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (e) {
      resolve(false);
    }
  });

  const abort = async () => {
    if (child) {
      child.kill("SIGINT");
    }
  };

  return { abort, install };
}
