// Shared CLI argument helpers for the maintenance scripts.
//
// Flags are always written as `--name` or `--name=value`; anything else is a
// positional argument. Keeping the distinction in one place prevents a flag
// such as `--dry-run` from being read as a slug/site/page number.

/** Non-flag arguments, in order. */
export function positionalArgs(argv) {
  return argv.filter((argument) => !argument.startsWith('--'));
}

/** Every value of `--name=value`, split on commas, trimmed and de-duplicated. */
export function flagList(argv, name) {
  const prefix = `--${name}=`;
  return [...new Set(argv
    .filter((argument) => argument.startsWith(prefix))
    .flatMap((argument) => argument.slice(prefix.length).split(','))
    .map((value) => value.trim())
    .filter(Boolean))];
}

/** First value of `--name=value`, or undefined. */
export function flagValue(argv, name) {
  return flagList(argv, name)[0];
}

/** Whether `--name` is present. */
export function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

/** Coerce a positional to a non-negative integer, using fallback when absent/invalid. */
export function nonNegativeInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : Math.max(0, fallback);
}
