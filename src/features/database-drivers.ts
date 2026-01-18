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
 * Get database driver options for the select prompt
 */
export function getDatabaseDriverOptions() {
  return databaseDrivers.map(driver => ({
    value: driver.value,
    label: driver.label,
    hint: driver.hint,
    disabled: driver.disabled,
  }));
}

/**
 * Get database driver config by value
 */
export function getDatabaseDriver(value: string): DatabaseDriver | undefined {
  return databaseDrivers.find(driver => driver.value === value);
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
