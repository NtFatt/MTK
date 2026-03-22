import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  createPayrollBonus,
  type CreatePayrollBonusPayload,
  type PayrollBonusEntryView,
  type PayrollProfileView,
  type UpdatePayrollBonusPayload,
  type UpsertPayrollProfilePayload,
  type VoidPayrollBonusPayload,
  updatePayrollBonus,
  upsertPayrollProfile,
  voidPayrollBonus,
} from "../services/payrollApi";

function buildIdempotencyKey(scope: string) {
  return `${scope}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function usePayrollMutations() {
  const queryClient = useQueryClient();

  const invalidatePayroll = () => {
    queryClient.invalidateQueries({ queryKey: ["payroll", "summary"] });
    queryClient.invalidateQueries({ queryKey: ["payroll", "staffDetail"] });
  };

  const upsertProfileMutation = useAppMutation<
    PayrollProfileView,
    any,
    { staffId: string; payload: UpsertPayrollProfilePayload }
  >({
    mutationFn: ({ staffId, payload }) => upsertPayrollProfile(staffId, payload),
    onSuccess: invalidatePayroll,
  });

  const createBonusMutation = useAppMutation<
    PayrollBonusEntryView,
    any,
    { staffId: string; payload: CreatePayrollBonusPayload }
  >({
    mutationFn: ({ staffId, payload }) =>
      createPayrollBonus(staffId, payload, buildIdempotencyKey(`payroll-bonus-create:${staffId}`)),
    onSuccess: invalidatePayroll,
  });

  const updateBonusMutation = useAppMutation<
    PayrollBonusEntryView,
    any,
    { payrollBonusId: string; payload: UpdatePayrollBonusPayload }
  >({
    mutationFn: ({ payrollBonusId, payload }) => updatePayrollBonus(payrollBonusId, payload),
    onSuccess: invalidatePayroll,
  });

  const voidBonusMutation = useAppMutation<
    PayrollBonusEntryView,
    any,
    { payrollBonusId: string; payload: VoidPayrollBonusPayload }
  >({
    mutationFn: ({ payrollBonusId, payload }) =>
      voidPayrollBonus(payrollBonusId, payload, buildIdempotencyKey(`payroll-bonus-void:${payrollBonusId}`)),
    onSuccess: invalidatePayroll,
  });

  return {
    upsertProfileMutation,
    createBonusMutation,
    updateBonusMutation,
    voidBonusMutation,
  };
}
