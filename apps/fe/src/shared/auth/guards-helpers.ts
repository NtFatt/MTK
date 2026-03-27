/**
 * Action guard helpers: can(permission), hasAny(permissions).
 * Kept separate so guards.tsx can satisfy react-refresh/only-export-components.
 */
import { authStore } from "./authStore";
import { hasAnyPermission, hasPermission } from "./permissions";

export function can(permission: string): boolean {
  return hasPermission(authStore.getState().session, permission);
}

export function hasAny(permissions: string[]): boolean {
  return hasAnyPermission(authStore.getState().session, permissions);
}
