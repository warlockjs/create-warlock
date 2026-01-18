# US-004: Git Repository Initialization

**Priority**: Medium  
**Status**: Planned

## User Story

> As a developer, I want to optionally initialize a Git repository so that my project has version control set up from the start.

## Acceptance Criteria

- [ ] Prompt displays yes/no confirmation
- [ ] If yes: initialize git, create `main` branch, stage all files, create initial commit
- [ ] If no: skip git initialization entirely
- [ ] Git operations show spinner with progress

## Technical Details

### Git Commands Executed

```bash
git init
git checkout -b main
git add .
git commit -m "Initial commit ⚡️"
```

### UI Flow

```
◆  Do you want to initialize Git repository?
│  ● Yes / ○ No
└

# If yes:
◐  📂 Initializing Git repository...
│  📂 Git repository initialized ✅
```

## Dependencies

- Uses `@clack/prompts` confirm input
- Uses `@clack/prompts` spinner for progress
- Runs after features selection (US-003)
- Requires `git` CLI to be available in PATH

## Tasks

- [ ] Display git initialization confirmation prompt
- [ ] If confirmed, show spinner with "Initializing Git repository..."
- [ ] Execute git commands in sequence
- [ ] On success, stop spinner with success message
- [ ] On failure, display error and halt setup
- [ ] Handle cancellation gracefully

## Error Handling

- If `git` is not available, display error: "Git is not installed or not in PATH"
- If any git command fails, display the error and halt setup
