export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  ok: true;
  value: T;
}

export interface Failure<E> {
  ok: false;
  error: E;
}

export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function failure<E>(error: E): Failure<E> {
  return { ok: false, error };
}

/**
 * Collects multiple results, returning all successes and all failures.
 */
export function collect<T, E>(results: Result<T, E>[]): Result<T[], E[]> {
  const successes: T[] = [];
  const failures: E[] = [];

  for (const r of results) {
    if (r.ok) successes.push(r.value);
    else failures.push(r.error);
  }

  if (failures.length > 0) return failure(failures);
  return success(successes);
}
