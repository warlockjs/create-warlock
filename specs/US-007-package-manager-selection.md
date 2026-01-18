# US-007: Package Manager Selection

## Description

As a developer creating a new Warlock project, I want to choose my preferred package manager so that I can use the tools I am most comfortable with or that are standard for my environment.

## Acceptance Criteria

1.  **Prompt**: The wizard asks "Which package manager do you want to use?".
2.  **Options**:
    - `npm`
    - `yarn`
    - `pnpm`
3.  **Default Selection Priority**:
    - Priority 1: The package manager currently executing the command (e.g., if run via `yarn create warlock`, default is `yarn`).
    - Priority 2: `yarn` (if installed on the system).
    - Priority 3: `pnpm` (if installed on the system).
    - Priority 4: `npm` (always available as fallback).
4.  **Behavior**: The selected package manager is used for all subsequent installation and execution commands (e.g., `install`, `dev`, `run`).
