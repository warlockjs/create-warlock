# US-006: Final Setup & Installation

**Priority**: High  
**Status**: Planned

## User Story

> As a developer, I want the setup to automatically install dependencies and finalize the project so that I can start developing immediately.

## Acceptance Criteria

- [ ] Package manager is auto-detected from the invoking command
- [ ] Template files are copied to project directory
- [ ] `package.json` is updated with project name, database driver, and selected feature dependencies
- [ ] Single install command runs with all dependencies merged
- [ ] Config stubs are copied for features that require them
- [ ] If JWT was requested: run JWT generation command
- [ ] If JWT was NOT requested: run warm-cache command
- [ ] Final success message with next steps is displayed

## Technical Details

### Package Manager Detection

Uses `which-pm-runs` package to detect which package manager invoked the script:

```typescript
import detectPackageManager from "which-pm-runs";

const pm = detectPackageManager();
// Returns: { name: "yarn" | "npm" | "pnpm", version: "x.x.x" }
// Falls back to "npm" if detection fails
```

> [!TIP]
> This approach works even when creating a project on the desktop or in a fresh directory with no existing lock files.

### Installation Flow

```
◐  📦 Installing dependencies...
│  📦 Dependencies installed successfully!

◐  🔧 Configuring selected features...
│  🔧 Features configured successfully!

# Then either:
◐  🔑 Generating JWT Secret...
│  🔑 JWT Secret generated 🔒

# Or (if JWT declined):
◐  ⚙️ Finishing framework setup...
│  ⚙️ Framework setup complete!
```

### Commands Executed

```bash
# 1. Install ALL dependencies (base + db driver + features)
{packageManager} install

# 2. JWT or warm-cache
{packageManager} jwt          # If JWT requested
# OR
npx warlock --warm-cache      # If JWT declined
```

### Final Message

```
🌟 Awesome! Your project is ready to rock! Run the following command to start development:

cd {projectName} && {packageManager} dev

💡 Pro tip: Install the Generator Z extension in VSCode for helpful code snippets and productivity boosters! 🚀
```

## Dependencies

- Runs as the final step after all prompts collected
- Depends on: US-001 through US-005 for collected answers
- Uses `cross-spawn` for command execution
- Uses `which-pm-runs` for package manager detection

## Tasks

- [ ] Detect package manager using `which-pm-runs`
- [ ] Copy template files to project directory
- [ ] Rename `_.gitignore` to `.gitignore`
- [ ] Copy `.env.example` to `.env`
- [ ] Update `package.json`:
  - Set `name` field (replace slashes with dashes)
  - Add database driver dependency (mongodb or pg)
  - Merge selected features' dependencies
  - Merge selected features' devDependencies
  - Replace `yarn` → detected PM in scripts
- [ ] Update `.env`:
  - `APP_NAME`
  - `DB_DRIVER`
  - `DB_PORT`
  - `DB_NAME`
- [ ] Execute Git init if requested (before install, can run in parallel)
- [ ] Run single `install` command
- [ ] Copy config stubs for features (e.g., herald → communicator.ts)
- [ ] Run JWT command OR warm-cache command
- [ ] Display final success message with next steps

## Error Handling

- On installation failure: display error and halt
- On JWT/warm-cache failure: display error and halt
- No automatic cleanup or rollback

## Implementation Notes

### Package.json Merge Strategy

```typescript
// 1. Read template package.json
const packageJson = getJsonFile(projectPath + "/package.json");

// 2. Update name
packageJson.name = appName.replaceAll("/", "-");

// 3. Add database driver
if (database === "mongodb") {
  packageJson.dependencies["mongodb"] = "^7.0.0";
} else if (database === "postgres") {
  packageJson.dependencies["pg"] = "^8.11.0";
}

// 4. Merge features
for (const feature of selectedFeatures) {
  Object.assign(packageJson.dependencies, featuresMap[feature].dependencies);
  if (featuresMap[feature].devDependencies) {
    Object.assign(
      packageJson.devDependencies,
      featuresMap[feature].devDependencies,
    );
  }
}

// 5. Replace yarn with detected PM
const content = JSON.stringify(packageJson);
const updated = content.replaceAll("yarn", detectedPackageManager);
putJsonFile(projectPath + "/package.json", JSON.parse(updated));
```

### Config Stub Ejection

After installation, copy config stubs for features that need them:

```typescript
for (const feature of selectedFeatures) {
  const stub = featuresMap[feature].configStub;
  if (stub) {
    putFile(projectPath + `/src/config/${stub.name}.ts`, stub.content);
  }
}
```

### Parallel Execution

Git initialization can run in parallel with dependency installation to save time:

```typescript
// Start both immediately
const gitPromise = useGit
  ? initializeGitRepository(projectPath)
  : Promise.resolve();
const installPromise = runCommand(packageManager, ["install"], projectPath);

// Wait for both
await Promise.all([gitPromise, installPromise.install]);
```
