import type { LogConfigurations } from "@warlock.js/core";
import { ConsoleLog } from "@warlock.js/logger";

export const consoleLog = new ConsoleLog();

const logConfigurations: LogConfigurations = {
  enabled: true,
  development: {
    channels: [consoleLog],
  },
  test: {
    channels: [consoleLog],
  },
  production: {
    channels: [consoleLog],
  },
};

export default logConfigurations;
