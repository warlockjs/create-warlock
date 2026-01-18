import { type LogConfigurations } from "@warlock.js/core";
import { ConsoleLog } from "@warlock.js/logger";

const consoleLog = new ConsoleLog();

const logConfigurations: LogConfigurations = {
  enabled: true,
  development: {
    channels: [consoleLog],
    // channels: [consoleLog],
    // channels: [],
  },
  test: {
    // channels: [consoleLog],
    channels: [consoleLog],
  },
  production: {
    channels: [consoleLog],
  },
};

export default logConfigurations;
