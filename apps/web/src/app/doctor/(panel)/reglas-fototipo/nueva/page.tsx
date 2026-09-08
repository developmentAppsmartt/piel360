"use client";

import { FitzpatrickRuleForm } from "@/components/fitzpatrick-rules/fitzpatrick-rule-form";
import { useCreateFitzpatrickRule, useFitzpatrickRules } from "@/lib/queries/fitzpatrick-rules";

export default function NewFitzpatrickRulePage() {
  const createRule = useCreateFitzpatrickRule();
  const rulesQuery = useFitzpatrickRules();

  return (
    <FitzpatrickRuleForm
      onSubmit={async (input) => {
        await createRule.mutateAsync({
          ...input,
          sortOrder: (rulesQuery.data?.length ?? 0) + 1,
        });
      }}
    />
  );
}
