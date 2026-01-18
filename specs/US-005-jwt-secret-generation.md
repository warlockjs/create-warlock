# US-005: JWT Secret Generation

**Priority**: High  
**Status**: Planned

## User Story

> As a developer, I want to optionally generate JWT secrets so that my authentication system is ready to use with secure signing keys.

## Acceptance Criteria

- [ ] Prompt displays yes/no confirmation
- [ ] If yes: run JWT generation command after dependencies are installed
- [ ] If no: skip JWT generation (warm-cache will be run instead in US-006)
- [ ] JWT command generates secure secrets for `.env`

## Technical Details

### JWT Generation Command

```bash
# Uses the package manager detected
yarn jwt     # or npm run jwt / pnpm jwt
# Which translates to: warlock jwt.generate
```

### UI Flow

```
◆  Do you want to generate JWT Secret key?
│  ● Yes / ○ No
└

# If yes (after deps installed):
◐  🔑 Generating JWT Secret...
│  🔑 JWT Secret generated 🔒
```

### Files Modified

| File                 | Change                                  |
| -------------------- | --------------------------------------- |
| `{projectName}/.env` | `JWT_SECRET` and related keys populated |

## Dependencies

- Uses `@clack/prompts` confirm input
- Uses `@clack/prompts` spinner for progress
- Runs after git initialization (US-004)
- Depends on dependencies being installed first (US-006)

## Tasks

- [ ] Display JWT generation confirmation prompt
- [ ] Store user's choice for later execution
- [ ] After dependencies installed, check if JWT was requested
- [ ] If yes, show spinner and run `{packageManager} jwt`
- [ ] On success, stop spinner with success message
- [ ] On failure, display error and halt setup

## Notes

- Running JWT command also warms the CLI cache as a side effect
- If user declines JWT, the warm-cache command runs instead (see US-006)
