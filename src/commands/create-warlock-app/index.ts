import { spinner } from "@clack/prompts";
import { App } from "src/helpers/app";
import { runPackageManagerCommand } from "../../helpers/package-manager";

export async function createWarlockApp(application: App) {
  application.init().use("warlock").updatePackageJson().updateDotEnv();

  await application.install();

  const gitInstalled = await application.git();

  if (gitInstalled) {
    const loading = spinner();

    loading.start("📂 Preparing Huskier 🚀");

    await application.exec("npx huskier-init");

    loading.stop("📂 Huskier initialized 🔗");
  }

  if (application.isInstalled) {
    const loading = spinner();

    loading.start("🔑 Generating JWT Secret");

    await application.exec(runPackageManagerCommand("jwt"));

    loading.stop("🔑 JWT Secret generated 🔒");
  }

  application.terminate();
}
