# US-002: Database Driver Selection

**Priority**: High  
**Status**: Planned

## User Story

> As a developer, I want to select a database driver (MongoDB or PostgreSQL) so that my project is pre-configured with the appropriate database connection settings.

## Acceptance Criteria

- [ ] Prompt displays as single-select radio list
- [ ] Options: MongoDB, PostgreSQL (no MySQL for now)
- [ ] Selection updates `DB_DRIVER` in `.env` file
- [ ] Appropriate npm package is added to dependencies for installation
- [ ] Database-specific ports are configured in `.env`

## Technical Details

### Database Options

| Option     | Value      | Package          | Default Port | Status                    |
| ---------- | ---------- | ---------------- | ------------ | ------------------------- |
| MongoDB    | `mongodb`  | `mongodb@^7.0.0` | 27017        | ✅ Available              |
| PostgreSQL | `postgres` | `pg@^8.11.0`     | 5432         | ✅ Available              |
| MySQL      | `mysql`    | `mysql2@^3.5.0`  | 3306         | 🚧 Coming Soon (disabled) |

### Environment Variables Updated

```env
# For MongoDB:
DB_DRIVER=mongodb
DB_PORT=27017

# For PostgreSQL:
DB_DRIVER=postgres
DB_PORT=5432
```

### Files Modified

| File                 | Change                                     |
| -------------------- | ------------------------------------------ |
| `{projectName}/.env` | `DB_DRIVER` and `DB_PORT` updated          |
| Internal state       | Track selected driver for dep installation |

## UI/UX

```
◆  Select database driver
│  ○ MongoDB
│  ● PostgreSQL
│  ○ MySQL (Coming Soon)  ← disabled, cannot select
└
```

## Dependencies

- Uses `@clack/prompts` select input with `disabled` option property
- Runs after project name input (US-001)

## Tasks

- [ ] Display database driver selection prompt
- [ ] Define options: MongoDB, PostgreSQL, MySQL (disabled)
- [ ] Store selection for later dependency installation
- [ ] Update `.env` with `DB_DRIVER` value
- [ ] Update `.env` with appropriate `DB_PORT`
- [ ] Handle cancellation gracefully

## Notes

- MySQL option is displayed but disabled with "Coming Soon" hint
- Both MongoDB and PostgreSQL drivers share the same Cascade ORM interface
