import { registerJWTSecretGeneratorCommand } from "@warlock.js/auth";
import { defineConfig } from "@warlock.js/core";

export default defineConfig({
  cli: {
    commands: [registerJWTSecretGeneratorCommand()],
  },
});
