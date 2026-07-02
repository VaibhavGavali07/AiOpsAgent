import { useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Code2, Loader2, AlertCircle } from "lucide-react";
import { useRules, useCreateRule, useUpdateRule, useDeleteRule } from "@/hooks/useRules";
import type { RuleType, Rule } from "@/types/agents";

interface Props {
  ruleType: RuleType;
  title: string;
  description: string;
  placeholder: string;
}

export function RulesPanel({ ruleType, title, description, placeholder }: Props) {
  const { data: rules = [], isLoading } = useRules(ruleType);
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const [name, setName]     = useState("");
  const [text, setText]     = useState("");
  const [addError, setAddError] = useState("");

  const handleAdd = async () => {
    setAddError("");
    if (!name.trim() || !text.trim()) {
      setAddError("Rule name and text are required.");
      return;
    }
    try {
      await createRule.mutateAsync({ name: name.trim(), rule_type: ruleType, rule_text: text.trim() });
      setName("");
      setText("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAddError(msg || "Failed to add rule.");
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400">{description}</p>

      {/* Add rule form */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-200 uppercase tracking-wide text-[11px]">Add {title}</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rule name (e.g. Major Change Approval)"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
        />
        {addError && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {addError}
          </div>
        )}
        <button
          onClick={handleAdd}
          disabled={createRule.isPending}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {createRule.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Plus className="h-3.5 w-3.5" />}
          Add Rule
        </button>
        <p className="text-[10px] text-gray-500">
          The LLM will compile your natural-language rule into structured JSON when a model is configured.
        </p>
      </div>

      {/* Rule list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading rules…
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No {title.toLowerCase()} defined yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={(enabled) => updateRule.mutate({ id: rule.id, enabled })}
              onDelete={() => deleteRule.mutate(rule.id)}
              isDeleting={deleteRule.isPending && deleteRule.variables === rule.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
  isDeleting,
}: {
  rule: Rule;
  onToggle: (v: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border ${rule.enabled ? "border-gray-700" : "border-gray-800 opacity-60"} bg-gray-900 overflow-hidden`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Toggle */}
        <button
          onClick={() => onToggle(!rule.enabled)}
          title={rule.enabled ? "Disable rule" : "Enable rule"}
          className="mt-0.5 shrink-0 text-gray-400 hover:text-brand-400 transition-colors"
        >
          {rule.enabled
            ? <ToggleRight className="h-4 w-4 text-brand-500" />
            : <ToggleLeft  className="h-4 w-4" />}
        </button>

        {/* Name + text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100">{rule.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{rule.rule_text}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {rule.compiled_json && (
            <button
              onClick={() => setExpanded((v) => !v)}
              title="Show compiled JSON"
              className="rounded p-1.5 text-gray-500 hover:text-brand-400 hover:bg-brand-900/40 transition-colors"
            >
              <Code2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            title="Delete rule"
            className="rounded p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-40"
          >
            {isDeleting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Compiled JSON accordion */}
      {expanded && rule.compiled_json && (
        <div className="border-t border-gray-800 px-4 py-3 bg-gray-950">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Compiled JSON</p>
          <pre className="text-[11px] text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
            {(() => {
              try { return JSON.stringify(JSON.parse(rule.compiled_json!), null, 2); }
              catch { return rule.compiled_json; }
            })()}
          </pre>
        </div>
      )}

      {/* Pending badge */}
      {!rule.compiled_json && (
        <div className="border-t border-gray-800 px-4 py-2">
          <span className="text-[10px] text-amber-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending compilation — configure an LLM in the Configuration tab to compile this rule.
          </span>
        </div>
      )}
    </div>
  );
}
