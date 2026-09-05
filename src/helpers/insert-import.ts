/**
 * Splice an `import` statement into a generated source file **in sorted
 * position**, rather than pushing it to the top.
 *
 * The scaffolded app formats with `prettier-plugin-organize-imports`, which
 * orders imports alphabetically by module specifier. So an import prepended to
 * a file that already has some is, by construction, in the wrong place — and
 * the developer meets it as a `prettier/prettier` error on their very first
 * `warlock dev`, in a file they did not write, about code they did not add.
 *
 * That is the defect class this scaffolder keeps paying for: a failure that
 * waits for the user's first ordinary action and then arrives attributed to
 * them.
 */

/**
 * Matches a top-level import statement and captures its module specifier.
 *
 * Deliberately narrow: this reads files THIS scaffolder generates from its own
 * templates, not arbitrary user source. It handles the two forms those
 * templates actually contain — a single-line import and a braced multi-line one
 * — and is not a general TypeScript parser. If a template ever grows an import
 * shape this misses, the insertion falls back to appending after the last match,
 * which is still ordered relative to everything it did recognise.
 */
const IMPORT_STATEMENT = /^import\s[\s\S]*?from\s+["']([^"']+)["'];?$/gm;

/**
 * Insert `statement` into `source` so the import block stays alphabetically
 * ordered by module specifier.
 *
 * @param source     the file's current contents.
 * @param statement  the whole import line to add, without a trailing newline.
 * @param specifier  the module specifier `statement` imports from — passed
 *                   rather than re-parsed, because the caller already knows it
 *                   and a second parser is a second thing to disagree.
 * @returns the file contents with the import in place. A file with no imports
 *          at all gets it at the top, which is the only ordering available.
 */
export function insertImportInSortedPosition(
  source: string,
  statement: string,
  specifier: string,
): string {
  const matches = [...source.matchAll(IMPORT_STATEMENT)];

  if (matches.length === 0) {
    return `${statement}\n${source}`;
  }

  const successor = matches.find(match => (match[1] as string).localeCompare(specifier) > 0);

  if (successor) {
    return `${source.slice(0, successor.index)}${statement}\n${source.slice(successor.index)}`;
  }

  const last = matches[matches.length - 1] as RegExpMatchArray;
  const endOfLast = (last.index as number) + last[0].length;

  return `${source.slice(0, endOfLast)}\n${statement}${source.slice(endOfLast)}`;
}
