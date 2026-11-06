// One way to report success or failure everywhere (DESIGN_PRINCIPLES rule 9).

export type AppErrorKind = "notFound" | "invalid" | "unauthorized" | "network" | "rateLimited";
export interface AppError {
  kind: AppErrorKind;
  message: string;
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T = never>(kind: AppErrorKind, message: string): Result<T> => ({
  ok: false,
  error: { kind, message },
});
