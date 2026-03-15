import { qk } from "@hadilao/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  runMaintenance,
  type MaintenanceInput,
  type MaintenanceResult,
} from "../services/maintenanceApi";

export function useRunMaintenanceMutation(branchId: string | number) {
  return useAppMutation<MaintenanceResult, unknown, MaintenanceInput>({
    invalidateKeys: [
      qk.ops.tables.list({ branchId }) as unknown as unknown[],
      qk.reservations.list({ branchId }) as unknown as unknown[],
    ],
    mutationFn: async (input) => runMaintenance(input),
  });
}