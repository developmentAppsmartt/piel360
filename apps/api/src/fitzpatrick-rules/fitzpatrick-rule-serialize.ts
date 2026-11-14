import { parseIdList } from './fitzpatrick-rules.util';

export type FitzpatrickRuleRow = {
  id: bigint;
  doctorId: bigint;
  label: string;
  description: string | null;
  fitzpatrickScale: string;
  skinTypes: unknown;
  priority: string;
  colorKey: string;
  sortOrder: number;
  isActive: boolean;
  routineIds: unknown;
  treatmentIds: unknown;
  productGroupIds: unknown;
  supplementGroupIds: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeFitzpatrickRule(rule: FitzpatrickRuleRow) {
  return {
    id: rule.id.toString(),
    doctorId: rule.doctorId.toString(),
    label: rule.label,
    description: rule.description,
    fitzpatrickScale: rule.fitzpatrickScale,
    skinTypes: parseIdList(rule.skinTypes),
    priority: rule.priority,
    colorKey: rule.colorKey,
    sortOrder: rule.sortOrder,
    isActive: rule.isActive,
    routineIds: parseIdList(rule.routineIds),
    treatmentIds: parseIdList(rule.treatmentIds),
    productGroupIds: parseIdList(rule.productGroupIds),
    supplementGroupIds: parseIdList(rule.supplementGroupIds),
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export type SerializedFitzpatrickRule = ReturnType<
  typeof serializeFitzpatrickRule
>;
