# Create a new module

Each module should consist of the following structure:

```
src/app/[module-name]/
├── main.ts                      # Entry point (auto-imported by Warlock.js)
├── routes.ts                    # Main routing file (auto-imported by Warlock.js)
├── controllers/                 # Request handlers
│   ├── [feature]/              # Grouped by feature (e.g., auth, profile)
│   │   └── *.controller.ts
│   └── [module].restful.ts     # RESTful resource controller (optional)
├── services/                    # Business logic layer
│   ├── *.service.ts
├── mail/                    # Business logic layer
│       └── *.ts
├── repositories/                # Data access layer
│   └── [resource].repository.ts
├── models/                      # Database models
│   └── [model-name]/
│       ├── index.ts
│       ├── [model-name].model.ts
│       └── migrations/
│           └── [date]_[model-name].migration.ts
├── requests/                   # Request validation schemas
│   ├── index.ts                # Simple validations (if all in one file)
│   └── *.request.ts         # Individual validation files
├── resources/                      # Response resource transformers
│   └── *.resource.ts
├── events/                      # Event handlers/listeners (auto-imported by Warlock.js)
│   └── *.ts
├── components/                  # Reusable components for use within mails
│   └── *.ts
├── types/                       # TypeScript type definitions
│   └── *.ts
└── utils/                       # Module-specific utilities
    ├── locales.ts              # Translations (auto-imported by Warlock.js)
    └── flags.ts                # Constants/flags
```

## Directory Structure Details

### 1. main.ts (Auto-imported)

Entry point file that is automatically imported by Warlock.js when the module loads. Use this for module initialization, event listeners, or setup code that should run when the module is loaded.

**Example:**

```typescript
import { onceConnected } from "@warlock.js/cascade";

// This function will be called once the app is connected to the database
onceConnected(async () => {
  // Module initialization code
  // Register event listeners
  // Setup module-specific configurations
});
```

### 2. routes.ts (Auto-imported)

Main routing file that defines all module endpoints. This file is automatically imported by Warlock.js. Use router guards (`guarded`, `guardedAdmin`, `guardedGuest`, etc.) to protect routes.

**Example:**

```typescript
import { router } from "@warlock.js/core";
import { guarded, guardedGuest } from "app/utils/router";
import { createAccountController } from "./controllers/auth/create-account.controller";
import { myProfile } from "./controllers/profile/my-profile.controller";

guardedGuest(() => {
  router.post("/register", createAccountController);
});

guarded(() => {
  router.get("/me", myProfile);
});
```

### 3. controllers/

Request handlers that process HTTP requests. Organize controllers by feature (e.g., `auth/`, `profile/`).

**Controller Structure:**

```typescript
import type { Request, RequestHandler, Response } from "@warlock.js/core";
import { someService } from "app/[module]/services/some.service";
import { someRequestSchema, type SomeRequest } from "app/[module]/requests/some.request";

export const someController: RequestHandler = async (request: SomeRequest, response: Response) => {
  const data = await someService(request.validated());
  return response.success({ data });
};

someController.validation = {
  schema: someRequestSchema,
};
```

**For RESTful Resources:**

```typescript
import { Restful, type RouteResource, v } from "@warlock.js/core";
import { SomeModel } from "../models/some";
import { someRepository } from "../repositories/some.repository";

class RestfulSome extends Restful<SomeModel> implements RouteResource {
  protected repository = someRepository;

  public validation: RouteResource["validation"] = {
    create: {
      schema: v.object({
        name: v.string().required(),
      }),
    },
  };
}

export const restfulSome = new RestfulSome();
```

### 4. services/

Business logic layer. Services handle the core functionality and interact with repositories.

**Service Structure:**

```typescript
import type { SomeModel } from "app/[module]/models/some";
import { someRepository } from "app/[module]/repositories/some.repository";

export async function someService(data: Record<string, any>): Promise<SomeModel> {
  return await someRepository.create(data);
}
```

### 5. repositories/

Data access layer that extends `RepositoryManager`. Handles database queries and filtering.

**Repository Structure:**

```typescript
import type { FilterByOptions, RepositoryOptions } from "@warlock.js/core";
import { RepositoryManager } from "@warlock.js/core";
import { SomeModel } from "../models/some";

export class SomeRepository extends RepositoryManager<SomeModel> {
  public source = SomeModel;

  protected defaultOptions: RepositoryOptions = this.withDefaultOptions({});

  protected filterBy: FilterByOptions = this.withDefaultFilters({
    name: "like",
    isActive: "bool",
  });
}

export const someRepository = new SomeRepository();
```

### 6. models/

Database models that extend base model classes (e.g., `Model`, `Auth`). Include migrations in the `migrations/` subdirectory.

**Model Structure:**

```typescript
import { Model } from "@warlock.js/core";
import type { StrictMode } from "@warlock.js/cascade";
import { SomeResource } from "../../resources/some.resource";
import { v, type Infer } from "@warlock.js/seal";

const someModelSchema = v.object({
  name: v.string().required(),
  email: v.email().required(),
});

type SomeModelType = Infer<typeof someModelSchema>;

export class SomeModel extends Model<SomeModelType> {
  public static table = "somes";
  public static strictMode: StrictMode = "fail";
  public static resource = SomeResource;

  public static schema = someModelSchema;

  public embed = ["id", "name"];
}
```

### 7. requests/

Request handlers that process HTTP requests. Organize controllers by feature (e.g., `auth/`, `profile/`).

**Request Structure:**

```typescript
import type { Request, RequestHandler, Response } from "@warlock.js/core";
import { someService } from "app/[module]/services/some.service";
import { someRequestSchema, type SomeRequest } from "app/[module]/requests/some.request";

export const someController: RequestHandler = async (request: SomeRequest, response: Response) => {
  const data = await someService(request.validated());
  return response.success({ data });
};

someController.validation = {
  schema: someRequestSchema,
};
```

**Important Rules:**

- If a module has simple validations, use `index.ts` to export all schemas
- If requests are complex or numerous, use separate `.request.ts` files
- Always export the schema and its inferred type
- Use `Infer<typeof schema>` (similar to Zod) to generate TypeScript types

**Simple Validation (index.ts):**

```typescript
import { v, type Infer } from "@warlock.js/seal";
import { type Request } from "@warlock.js/core";
import { type User } from "app/users/models/user";

export const createSchema = v.object({
  name: v.string().minLength(2).required(),
});

export const updateSchema = v.object({
  name: v.string().minLength(2).optional(),
});

export type CreateData = Infer<typeof createSchema>;
export type UpdateData = Infer<typeof updateSchema>;

export type CreatePostRequest<User, CreateData>;
export type UpdatePostRequest<User, UpdateData>;
```

**Individual Validation Files:**

```typescript
// requests/create-account.request.ts
import { v, type Infer } from "@warlock.js/seal";
import { type Request } from "@warlock.js/core";

export const createAccountSchema = v.object({
  name: v.string().minLength(2).required(),
  email: vemail().required(),
  password: v.string().required().strongPassword(),
});

export type CreateAccountData = Infer<typeof createAccountSchema>;

export type CreateAccountRequest<undefined, CreateAccountData>;
```

**Usage in Controller:**

```typescript
import type { Request, RequestHandler, Response } from "@warlock.js/core";
import type { User } from "app/[module]/models/user";
import {
  createAccountSchema,
  type CreateAccountRequest,
} from "app/[module]/requests/create-account.request";

export const createAccountController: RequestHandler = async (
  request: CreateAccountRequest,
  response: Response,
) => {
  // request.validated() is now typed as CreateAccountData
  const data = request.validated();
  // ...
};

createAccountController.validation = {
  schema: createAccountSchema,
};
```

### 8. resources/

Resources define how data is transformed before being sent to clients.

**Resource Structure:**

```typescript
import { Resource } from "@warlock.js/core";
import {} from "app/utils/output";

export class SomeResource extends Resource {
  public schema = {
    name: "string",
    id: "int",
    type: () => "user", // custom output value
    image: (value) => (value.startsWith("/") ? value : "/" + value),
  };
}
```

### 9. events/ (Auto-imported)

Event handlers and listeners for model events or application events. **All files in this folder are automatically imported by Warlock.js** - no need to manually import them elsewhere.

> During development server, It's very important to use export const cleanup for events unbinding to prevent duplicate events registery on hmr.

**Event Structure:**

```typescript
import { Response } from "@warlock.js/core";

export function someEventHandler(response: Response) {
  // Event handling logic
}

const event = Response.on("sending", someEventHandler);

export const cleanup = [event];
// or use a callback if the event is not an unsubscribe function
export const cleanup = () => event.unsbcribe();
```

**Note:** Files in the `events/` folder are auto-imported, similar to `routes.ts`, `main.ts`, and `utils/locales.ts`. Just create the file and it will be loaded automatically.

### 10. services/mail/ (or separate mail/ folder)

Email service functions for sending notifications. **Mail files should be suffixed with `.mail.ts`** (e.g., `welcome.mail.ts`, `reset-password.mail.ts`).

You can organize mail services either as:

- Files in `services/mail/` folder (if you have multiple mail-related services) - **Recommended**
- Individual files in `services/` folder (if you have few mail services)
- A separate `mail/` folder at module root (legacy pattern, still supported)

**Mail Structure:**

```tsx
// services/mail/welcome.mail.ts
import { sendMail } from "@warlock.js/core";
import type { SomeModel } from "../models/some";
import { SomeEmailComponent } from "../components/some-email.component";

export default async function sendWelcomeEmail(model: SomeModel) {
  await sendMail({
    to: model.get("email"),
    subject: "Subject",
    component: <SomeEmailComponent name={model.get("name")} />,
  });
}
```

**Recommendation:** Use `services/mail/` folder for better organization when you have multiple mail templates, and always suffix mail files with `.mail.ts`.

### 11. components/

Reusable components for use within email templates. These are typically functions that return HTML strings or React-like components that can be used in mail services.

**Component Structure:**

```tsx
export function WelcomeEmailComponent(data: { name: string; email: string }) {
  return `
    <div>
      <h1>Welcome, ${data.name}!</h1>
      <p>Your email: ${data.email}</p>
    </div>
  `;
}
```

**Usage in Mail:**

```tsx
import { sendMail } from "@warlock.js/core";
import { WelcomeEmailComponent } from "../components/welcome-email.component";

export default async function sendWelcomeEmail(user: User) {
  await sendMail({
    to: user.get("email"),
    subject: "Welcome",
    component: <WelcomeEmailComponent name={user.get("name")} email={user.get("email")} />,
  });
}
```

### 12. types/

TypeScript type definitions specific to the module. Use this folder for:

- Request/response types
- Service parameter types
- Module-specific interfaces
- Type utilities

**Types Structure:**

```typescript
// types/user.types.ts
export interface UserPreferences {
  theme: "light" | "dark";
  notifications: boolean;
}

export type UserRole = "admin" | "user" | "guest";
```

### 13. utils/

Module-specific utility functions. **Must include `locales.ts`** which is automatically imported by Warlock.js.

**utils/locales.ts (Auto-imported):**

```typescript
import { groupedTranslations } from "@mongez/localization";

groupedTranslations("moduleName", {
  key1: {
    en: "English translation",
    ar: "Arabic translation",
  },
  invalidCredentials: {
    en: "Invalid credentials",
    ar: "بيانات الدخول غير صحيحة",
  },
});
```

**utils/flags.ts (Constants):**

```typescript
// Module-specific constants and flags
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
} as const;

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;
```

**Other Utilities:**

```typescript
// utils/helpers.ts or similar
export function formatUserName(user: User): string {
  return `${user.get("firstName")} ${user.get("lastName")}`;
}
```

**Note:** The `utils/locales.ts` file is automatically imported by Warlock.js, similar to `routes.ts`, `main.ts`, and files in the `events/` folder.

## Best Practices

1. **Naming Conventions:**
   - Use kebab-case for file names
   - Use PascalCase for class names
   - Use camelCase for functions and variables

2. **Controller Organization:**
   - Group related controllers in subdirectories (e.g., `auth/`, `profile/`)
   - Keep controllers thin - delegate business logic to services

3. **Service Layer:**
   - Services should contain reusable business logic
   - Services interact with repositories, not directly with models

4. **Repository Pattern:**
   - All database operations should go through repositories
   - Define filter options in the repository class

5. **Validation:**
   - **All validation schemas must be in the `validation/` folder**
   - Always attach validation to controllers using `controller.validation = { schema }`
   - Export TypeScript types from validation files using `Infer<typeof schema>`
   - Use the inferred type as a generic parameter in `Request<Model, ValidationType>`
   - Use `index.ts` for simple validations, separate `.validation.ts` files for complex ones

6. **Models:**
   - Define casts for all fields
   - Specify embedded fields for performance
   - Include default values when needed

7. **Routes:**
   - Use appropriate guards (`guarded`, `guardedAdmin`, `guardedGuest`)
   - Group related routes together
   - Use RESTful resources when appropriate
   - Routes file is auto-imported by Warlock.js

8. **Auto-imported Files:**
   - `main.ts` - Module entry point
   - `routes.ts` - Route definitions
   - `utils/locales.ts` - Translations
   - All files in `events/` folder - Event handlers
   - No need to manually import these files elsewhere

9. **Organization:**
   - Keep mail services organized: use `services/mail/` folder if multiple, or individual files in `services/` if few
   - Use `components/` folder for reusable email components
   - Define module-specific types in `types/` folder
   - Use `utils/flags.ts` for constants and configuration flags
