import { registerJWTSecretGeneratorCommand } from "@warlock.js/auth";
import { defineConfig } from "@warlock.js/core";
import { registerPostmanCommand } from "@warlock.js/postman";

export default defineConfig({
  cli: {
    commands: [registerPostmanCommand(), registerJWTSecretGeneratorCommand()],
  },
});
