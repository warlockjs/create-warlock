import { confirm, spinner } from "@clack/prompts";
import path from "path";
import rimraf from "rimraf";
import { App } from "src/helpers/app";
import { runPackageManagerCommand } from "../../helpers/package-manager";

export async function createWarlockApp(application: App) {
  // Initialize the basic app structure
  application.init().use("warlock").updatePackageJson().updateDotEnv();

  // Start the installation process in background immediately
  const installProcess = application.install();

  // Collect all answers first
  const installDeps =
    (await confirm({
      message: "Do you want to install dependencies?",
    })) === true;

  // If user doesn't want to install dependencies, abort the background process
  if (!installDeps) {
    installProcess.abort();

    // Remove node_modules Asynchronously
    const nodeModulesPath = path.join(application.path, "node_modules");

    rimraf(nodeModulesPath, () => {});
  }

  const useGit =
    (await confirm({
      message: "Do you want to initialize Git repository?",
    })) === true;

  // Only ask about JWT if dependencies will be installed
  let useJWT = false;
  if (installDeps) {
    useJWT =
      (await confirm({
        message: "Do you want to generate JWT Secret key?",
      })) === true;
  }

  // Now execute all confirmed tasks

  // Handle Git initialization first if requested
  if (useGit) {
    const loading = spinner();
    loading.start("📂 Initializing Git repository...");
    await application.git();
    loading.stop("📂 Git repository initialized ✅");
  }

  // Wait for dependencies installation if it was requested
  if (installDeps) {
    const loading = spinner();
    loading.start("📦 Installing dependencies...");
    await installProcess.install;
    loading.stop("📦 Dependencies installed successfully!");

    // Generate JWT if requested
    if (useJWT) {
      const jwtLoading = spinner();
      jwtLoading.start("🔑 Generating JWT Secret...");
      await application.exec(runPackageManagerCommand("jwt"));
      jwtLoading.stop("🔑 JWT Secret generated 🔒");
    }
  }

  application.terminate();
}
