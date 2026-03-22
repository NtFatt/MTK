export type ShiftCode = "MORNING" | "EVENING";

export type ShiftTemplateDefinition = {
  code: ShiftCode;
  name: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
};

export const SHIFT_TEMPLATES: ShiftTemplateDefinition[] = [
  {
    code: "MORNING",
    name: "Ca sáng",
    startTime: "08:00:00",
    endTime: "16:00:00",
    crossesMidnight: false,
  },
  {
    code: "EVENING",
    name: "Ca tối",
    startTime: "16:00:00",
    endTime: "00:30:00",
    crossesMidnight: true,
  },
];

export function getShiftTemplate(code: string): ShiftTemplateDefinition | null {
  const normalized = String(code ?? "").trim().toUpperCase();
  return SHIFT_TEMPLATES.find((template) => template.code === normalized) ?? null;
}
