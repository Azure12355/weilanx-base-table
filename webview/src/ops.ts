import type { FieldType } from "../../src/core/types";

export interface OpDef {
  op: string;
  label: string;
  needsValue: boolean;
}

const TEXT_OPS: OpDef[] = [
  { op: "contains", label: "包含", needsValue: true },
  { op: "notContains", label: "不包含", needsValue: true },
  { op: "is", label: "等于", needsValue: true },
  { op: "isNot", label: "不等于", needsValue: true },
  { op: "empty", label: "为空", needsValue: false },
    { op: "notEmpty", label: "不为空", needsValue: false },
];

export const OPS_BY_TYPE: Record<FieldType, OpDef[]> = {
  text: TEXT_OPS,
  longtext: TEXT_OPS,
  select: [
    { op: "is", label: "是", needsValue: true },
    { op: "isNot", label: "不是", needsValue: true },
    { op: "empty", label: "为空", needsValue: false },
    { op: "notEmpty", label: "不为空", needsValue: false },
  ],
  multi: [
    { op: "contains", label: "包含", needsValue: true },
    { op: "notContains", label: "不包含", needsValue: true },
    { op: "empty", label: "为空", needsValue: false },
    { op: "notEmpty", label: "不为空", needsValue: false },
  ],
  date: [
    { op: "is", label: "等于", needsValue: true },
    { op: "before", label: "早于", needsValue: true },
    { op: "after", label: "晚于", needsValue: true },
    { op: "empty", label: "为空", needsValue: false },
    { op: "notEmpty", label: "不为空", needsValue: false },
  ],
  number: [
    { op: "eq", label: "=", needsValue: true },
    { op: "ne", label: "≠", needsValue: true },
    { op: "gt", label: ">", needsValue: true },
    { op: "lt", label: "<", needsValue: true },
    { op: "gte", label: "≥", needsValue: true },
    { op: "lte", label: "≤", needsValue: true },
    { op: "empty", label: "为空", needsValue: false },
  ],
  checkbox: [
    { op: "checked", label: "已勾选", needsValue: false },
    { op: "unchecked", label: "未勾选", needsValue: false },
  ],
  link: [
    { op: "contains", label: "包含", needsValue: true },
    { op: "empty", label: "为空", needsValue: false },
    { op: "notEmpty", label: "不为空", needsValue: false },
  ],
};

export function opsFor(type: FieldType | undefined): OpDef[] {
  return OPS_BY_TYPE[type ?? "text"];
}

export function needsValue(type: FieldType | undefined, op: string): boolean {
  return opsFor(type).find((o) => o.op === op)?.needsValue ?? true;
}
