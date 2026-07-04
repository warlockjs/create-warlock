/**
 * Database driver options and configuration
 */
export type DatabaseDriver = {
  value: string;
  label: string;
  package: string;
  packageVersion: string;
  defaultPort: number;
  disabled?: boolean;
  hint?: string;
};

/**
 * Sentinel `--db` value / select option that means "no database at all".
 *
 * Picking it wires no driver, pulls no driver package, and deletes the
 * template's `src/config/database.ts` — the framework's database connector is
 * config-gated on that file, so with it gone the app boots with no database.
 */
export const NO_DATABASE = "none";

export const databaseDrivers: DatabaseDriver[] = [
  {
    value: "mongodb",
    label: "MongoDB",
    package: "mongodb",
    packageVersion: "^7.0.0",
    defaultPort: 27017,
  },
  {
    value: "postgres",
    label: "PostgreSQL",
    package: "pg",
    packageVersion: "^8.11.0",
    defaultPort: 5432,
  },
  {
    value: "mysql",
    label: "MySQL (Coming Soon)",
    package: "mysql2",
    packageVersion: "^3.5.0",
    defaultPort: 3306,
    disabled: true,
    hint: "MySQL support coming in a future release",
  },
];

/**
 * Get database driver options for the select prompt.
 *
 * The real drivers come first, followed by a "None" opt-out so the user can
 * scaffold an app with no database.
 */
export function getDatabaseDriverOptions() {
  return [
    ...databaseDrivers.map(driver => ({
      value: driver.value,
      label: driver.label,
      hint: driver.hint,
      disabled: driver.disabled,
    })),
    {
      value: NO_DATABASE,
      label: "None",
      hint: "No database — skips the driver and removes src/config/database.ts",
      disabled: undefined,
    },
  ];
}

/**
 * Get database driver config by value
 */
export function getDatabaseDriver(value: string): DatabaseDriver | undefined {
  return databaseDrivers.find(driver => driver.value === value);
}

/**
 * Whether a `--db` value / selection means "no database".
 */
export function isNoDatabase(value: string | undefined): boolean {
  return value === NO_DATABASE;
}

/**
 * Human-readable database label for the success screen: `"None"` when no
 * database was chosen, otherwise the driver's own label (falling back to the
 * raw value for an unrecognized driver).
 */
export function getDatabaseLabel(value: string): string {
  if (isNoDatabase(value)) return "None";

  return getDatabaseDriver(value)?.label ?? value;
}

/**
 * Get database driver dependency
 */
export function getDatabaseDependency(
  driverValue: string,
): Record<string, string> {
  const driver = getDatabaseDriver(driverValue);
  if (!driver) return {};

  return {
    [driver.package]: driver.packageVersion,
  };
}
