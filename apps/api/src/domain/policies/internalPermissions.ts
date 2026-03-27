// Backward-compatible shim.
// Runtime source of truth for the API lives at src/domain/rbac/permissions.ts.

export {
  type Permission as InternalPermission,
  type InternalRole,
  ROLE_PERMISSIONS as INTERNAL_ROLE_PERMISSIONS,
  hasPermission as hasInternalPermission,
} from "../rbac/permissions.js";
