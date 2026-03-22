export type KitchenActionErrorState = {
  message: string;
  correlationId?: string | null;
};

export function getKitchenActionErrorState(error: unknown): KitchenActionErrorState {
  const e = error as any;
  const code =
    e?.response?.data?.code ??
    e?.data?.code ??
    e?.code ??
    null;

  const messageMap: Record<string, string> = {
    INSUFFICIENT_INGREDIENT: "Không đủ nguyên liệu để bắt đầu chế biến.",
    RECIPE_NOT_CONFIGURED: "Có món chưa cấu hình công thức nguyên liệu.",
    RECIPE_INGREDIENT_NOT_FOUND: "Công thức món đang tham chiếu nguyên liệu không hợp lệ.",
    DUPLICATE_CONSUMPTION: "Thao tác bắt đầu chế biến đã được xử lý trước đó.",
    ORDER_ITEMS_EMPTY: "Đơn hàng không có món để tiêu hao nguyên liệu.",
    INVALID_TRANSITION: "Trạng thái đơn hàng hiện tại không cho phép thao tác này.",
    INVALID_KITCHEN_TRANSITION: "Nhóm món hiện tại không khớp với bước xử lý bếp này.",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác bếp này.",
    ORDER_NOT_FOUND: "Không tìm thấy ticket cần thao tác.",
    KITCHEN_TICKET_NOT_FOUND: "Nhóm món này đã đổi trạng thái hoặc không còn nằm trong queue.",
  };

  return {
    message:
      (code && messageMap[code]) ||
      e?.response?.data?.message ||
      e?.message ||
      "Có lỗi xảy ra khi cập nhật trạng thái ticket.",
    correlationId: e?.correlationId ?? e?.response?.data?.meta?.requestId ?? null,
  };
}
