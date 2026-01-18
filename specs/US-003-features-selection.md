# US-003: Features Selection

**Priority**: High  
**Status**: Planned

## User Story

> As a developer, I want to select optional features from a checklist so that my project includes only the packages I need.

## Acceptance Criteria

- [ ] Prompt displays as multi-select checkbox list
- [ ] All features unchecked by default (no pre-selection)
- [ ] Features list is hardcoded in create-warlock (not dynamically loaded)
- [ ] Selected features' dependencies are merged into `package.json` before installation
- [ ] Config files are copied after installation for features that require them

## Technical Details

### Available Features

| Feature     | Description                          | Dependencies                                                                                             | Dev Dependencies                                   |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `react`     | React/ReactDOM for SSR (mails, etc.) | `react@^19.2.3`, `react-dom@^19.2.3`                                                                     | `@types/react@^19.2.7`, `@types/react-dom@^19.2.3` |
| `image`     | Sharp for image processing           | `sharp@^0.34.5`                                                                                          | -                                                  |
| `mail`      | Nodemailer for sending emails        | `nodemailer@^6.9.14`                                                                                     | `@types/nodemailer@^7.0.4`                         |
| `redis`     | Redis cache driver                   | `redis@^4.6.13`                                                                                          | -                                                  |
| `scheduler` | Warlock scheduler for tasks          | `@warlock.js/scheduler@~4.0.0`                                                                           | -                                                  |
| `s3`        | AWS S3 cloud storage                 | `@aws-sdk/client-s3@^3.955.0`, `@aws-sdk/lib-storage@^3.955.0`, `@aws-sdk/s3-request-presigner@^3.955.0` | -                                                  |
| `herald`    | RabbitMQ message broker              | `@warlock.js/herald@~4.0.0`, `amqplib@^0.10.0`                                                           | `@types/amqplib@^0.10.0`                           |

> [!NOTE]
> Swagger and Postman features are not yet implemented and will be added in a future release.

### Implementation Approach

**Hardcode dependencies + Single Install**

```typescript
const featuresMap = {
  react: {
    dependencies: { react: "^19.2.3", "react-dom": "^19.2.3" },
    devDependencies: {
      "@types/react": "^19.2.7",
      "@types/react-dom": "^19.2.3",
    },
  },
  herald: {
    dependencies: { "@warlock.js/herald": "~4.0.0", amqplib: "^0.10.0" },
    devDependencies: { "@types/amqplib": "^0.10.0" },
    configStub: { name: "communicator", content: communicatorsConfigStub },
  },
  // ... etc
};

// Merge selected features into package.json before install
for (const feature of selectedFeatures) {
  Object.assign(packageJson.dependencies, featuresMap[feature].dependencies);
  Object.assign(
    packageJson.devDependencies,
    featuresMap[feature].devDependencies,
  );
}
```

**Benefits:**

1. Single `install` command - faster user experience
2. No dependency on `warlock add` being available
3. Config stubs can be copied directly after install

### Config Stubs

Some features require config file creation after installation:

| Feature  | Config File                  | Action                    |
| -------- | ---------------------------- | ------------------------- |
| `herald` | `src/config/communicator.ts` | Copy stub content to file |

## UI/UX

```
◆  Select features to include
│  ◻ React (SSR for mails)
│  ◻ Image processing (Sharp)
│  ◻ Mail (Nodemailer)
│  ◻ Redis cache
│  ◻ Scheduler
│  ◻ S3 storage
│  ◻ Herald (RabbitMQ)
└
```

## Dependencies

- Uses `@clack/prompts` multiselect input
- Runs after database driver selection (US-002)

## Tasks

- [ ] Define hardcoded `featuresMap` with deps, devDeps, and config stubs
- [ ] Display multi-select checkbox prompt
- [ ] Ensure no features are pre-selected
- [ ] Store selected features for package.json merge (US-006)
- [ ] Handle cancellation gracefully

## Notes

- Database drivers (MongoDB, PostgreSQL) are handled separately in US-002
- Swagger and Postman are excluded until implemented
- All deps are merged into `package.json` before running install (single install pass)
