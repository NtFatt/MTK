import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@hadilao/contracts";
import { useAppMutation } from "../../../../../shared/http/useAppMutation";
import { normalizeApiError } from "../../../../../shared/http/normalizeApiError";
import {
  createTable,
  deleteTable,
  updateTable,
  type CreateTablePayload,
  type UpdateTablePayload,
} from "../services/adminTablesApi";

type Feedback = {
  variant: "success" | "destructive";
  title: string;
  message: string;
  correlationId?: string | null;
};

type UpdateVariables = {
  tableId: string;
  payload: UpdateTablePayload;
};

type DeleteVariables = {
  branchId: string | number;
  tableId: string;
  code?: string;
};

function toErrorFeedback(error: unknown, fallback: string): Feedback {
  const parsed = normalizeApiError(error);
  return {
    variant: "destructive",
    title: "Không thể hoàn tất thao tác",
    message: parsed.message || fallback,
    correlationId: parsed.correlationId ?? null,
  };
}

export function useTableSetupMutations() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const invalidateList = (branchId: string | number) => {
    void queryClient.invalidateQueries({ queryKey: qk.ops.tables.list({ branchId }) });
  };

  const createRecord = useAppMutation({
    mutationFn: createTable,
    onMutate: () => setFeedback(null),
    onSuccess: (_data, variables) => {
      setFeedback({
        variant: "success",
        title: "Đã tạo bàn",
        message: `Bàn ${variables.code.trim()} đã được tạo thành công.`,
      });
      invalidateList(variables.branchId);
    },
    onError: (error) => {
      setFeedback(toErrorFeedback(error, "Không thể tạo bàn mới."));
    },
  });

  const updateRecord = useAppMutation({
    mutationFn: ({ tableId, payload }: UpdateVariables) => updateTable(tableId, payload),
    onMutate: () => setFeedback(null),
    onSuccess: (_data, variables) => {
      setFeedback({
        variant: "success",
        title: "Đã cập nhật bàn",
        message: `Cấu hình bàn ${variables.payload.code.trim()} đã được cập nhật.`,
      });
      invalidateList(variables.payload.branchId);
    },
    onError: (error) => {
      setFeedback(toErrorFeedback(error, "Không thể cập nhật cấu hình bàn."));
    },
  });

  const deleteRecord = useAppMutation({
    mutationFn: ({ branchId, tableId }: DeleteVariables) => deleteTable(branchId, tableId),
    onMutate: () => setFeedback(null),
    onSuccess: (_data, variables) => {
      setFeedback({
        variant: "success",
        title: "Đã xóa bàn",
        message: variables.code
          ? `Bàn ${variables.code.trim()} đã được xóa khỏi sơ đồ.`
          : "Bàn đã được xóa khỏi sơ đồ.",
      });
      invalidateList(variables.branchId);
    },
    onError: (error) => {
      setFeedback(toErrorFeedback(error, "Không thể xóa bàn này."));
    },
  });

  return {
    feedback,
    clearFeedback: () => setFeedback(null),
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
