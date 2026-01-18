# US-001: Project Name Input

**Priority**: High  
**Status**: Planned

## User Story

> As a developer, I want to enter a project name when running `yarn create warlock` so that my project folder and configuration files are properly named.

## Acceptance Criteria

- [ ] Prompt displays: "Enter the app name"
- [ ] Placeholder text shows: "warlock-app"
- [ ] Input is validated for non-empty value
- [ ] Project folder is created with the entered name
- [ ] `package.json` name field is updated with the project name (slashes replaced with dashes)
- [ ] `.env` APP_NAME is updated with the project name
- [ ] Node.js version check: minimum v20.0.0 required
- [ ] If user cancels (Ctrl+C), display message and exit gracefully

## Technical Details

### Input Validation

```
- Trim whitespace from input
- Reject empty input with error: "Application name is required to create a new app"
- Node.js version < 20: "Node.js version must be at least 20.0.0"
```

### Files Modified

| File                         | Change                      |
| ---------------------------- | --------------------------- |
| `{projectName}/package.json` | `name` field updated        |
| `{projectName}/.env`         | `APP_NAME` variable updated |
| `{projectName}/.env`         | `DB_NAME` variable updated  |

## UI/UX

```
✨ Let's create a new Warlock Js App ✨ v4.x.x
◆  Enter the app name
│  warlock-app_
└
```

## Dependencies

- Uses `@clack/prompts` text input
- Runs after intro banner display

## Tasks

- [ ] Display version banner with `@clack/prompts` intro
- [ ] Prompt for project name with text input
- [ ] Validate Node.js version ≥ 20
- [ ] Validate non-empty project name
- [ ] Create project directory at resolved path
- [ ] Handle cancellation gracefully
