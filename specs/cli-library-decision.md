# CLI Library Comparison & Decision

## Context

Evaluating whether to continue using `@clack/prompts` or switch to an alternative for v4 create-warlock wizard.

## Libraries Compared

| Library            | Pros                                                                    | Cons                              | Used By                  |
| ------------------ | ----------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| **@clack/prompts** | Beautiful UI, built-in spinners, groups, modern API (2023+), TypeScript | Newer, smaller community          | SvelteKit, create-t3-app |
| **Enquirer**       | Lightweight, fast, mature                                               | Less opinionated styling          | ESLint, Webpack, Yarn    |
| **Prompts**        | Minimal, async/await native                                             | Basic styling, less features      | create-react-app         |
| **Inquirer**       | Most popular, many prompt types                                         | Heavier, older callback-style API | Yeoman generators        |

## Decision

✅ **Keep using `@clack/prompts`**

### Rationale

1. **Best DX for wizard flows** - Built-in spinner, intro/outro, and task grouping are perfect for create-warlock
2. **Modern API** - Promise-based, excellent TypeScript support
3. **Beautiful defaults** - Minimal configuration needed for professional-looking output
4. **Already integrated** - No migration effort required
5. **Active development** - Maintained by the Astro team

### Example Code Comparison

```typescript
// @clack/prompts - Clean, grouped flow
import { intro, text, select, confirm, spinner, outro } from '@clack/prompts';

intro('✨ Create Warlock App');
const name = await text({ message: 'Project name' });
const db = await select({ message: 'Database', options: [...] });
const s = spinner();
s.start('Installing...');
await install();
s.stop('Done!');
outro('Ready to rock! 🎸');

// Enquirer - Requires more setup for same result
import Enquirer from 'enquirer';
const { name } = await Enquirer.prompt({ type: 'input', name: 'name', message: 'Project name' });
// No built-in spinners, need ora separately
```

## Alternatives to Consider Later

- **Ink** - React for CLIs, useful if wizard becomes more complex with real-time updates
- **Pastel** - Framework on top of Ink, good for full CLI applications
