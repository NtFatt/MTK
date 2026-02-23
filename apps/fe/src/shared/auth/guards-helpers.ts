/**
 * Action guard helpers: can(permission), hasAny(permissions).
 * Kept separate so guards.tsx can satisfy react-refresh/only-export-components.
 */
import { authStore } from "./authStore";

export function can(permission: string): boolean {
  const permissions = authStore.getState().session?.permissions ?? [];
  return permissions.includes(permission);
}

export function hasAny(permissions: string[]): boolean {
  const userPerms = authStore.getState().session?.permissions ?? [];
  return permissions.some((p) => userPerms.includes(p));
}
