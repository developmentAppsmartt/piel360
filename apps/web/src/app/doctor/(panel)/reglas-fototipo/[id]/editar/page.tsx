"use client";

import { useParams } from "next/navigation";
import { FitzpatrickRuleForm } from "@/components/fitzpatrick-rules/fitzpatrick-rule-form";
import { useFitzpatrickRule, useUpdateFitzpatrickRule } from "@/lib/queries/fitzpatrick-rules";

export default function EditFitzpatrickRulePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const ruleQuery = useFitzpatrickRule(id);
  const updateRule = useUpdateFitzpatrickRule();

  if (ruleQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando regla…</p>;
  }
  if (!ruleQuery.data) {
    return <p className="text-sm text-destructive">Regla no encontrada.</p>;
  }

  return (
    <FitzpatrickRuleForm
      rule={ruleQuery.data}
      onSubmit={async (input) => {
        await updateRule.mutateAsync({ id, input });
      }}
    />
  );
}
