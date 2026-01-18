import { showSuccessScreen } from "./src/ui/banner";

console.log("Testing Success Screen Banner Alignment...\n");

showSuccessScreen({
  projectName: "my-awesome-project",
  database: "MongoDB",
  features: ["react", "image", "mail", "redis", "scheduler"],
  packageManager: "yarn",
});

console.log("\nTesting with long features list to verify expansion...\n");

showSuccessScreen({
  projectName: "complex-enterprise-app",
  database: "MongoDB",
  features: [
    "react",
    "image",
    "mail",
    "redis",
    "scheduler",
    "s3-storage",
    "herald",
    "social-login",
    "payment-gateway",
    "audit-logs",
  ],
  packageManager: "pnpm",
});

console.log("\nTesting with empty features...\n");

showSuccessScreen({
  projectName: "simple-app",
  database: "PostgreSQL",
  features: [],
  packageManager: "npm",
});
