import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2, X } from "lucide-react";
import { PageIntro } from "@/components/ui/PageIntro";
import { useTimedMessage } from "@/hooks/useTimedMessage";
import { api } from "@/services/api";
import type { Category, Rule } from "@/types/api";

type RuleConditionForm = {
  field: string;
  operator: string;
  value: string;
};

type RuleActionForm = {
  type: string;
  value: string;
};

const initialForm = {
  name: "",
  isEnabled: true,
  priority: "200",
  conditions: [{ field: "merchant", operator: "contains", value: "" }] as RuleConditionForm[],
  actions: [{ type: "set_category", value: "" }] as RuleActionForm[],
};

const fieldOptions = [
  { value: "merchant", label: "Merchant" },
  { value: "amount", label: "Amount" },
  { value: "type", label: "Type" },
  { value: "category", label: "Category" },
];

const actionOptions = [
  { value: "set_category", label: "Set Category" },
  { value: "add_tag", label: "Add Tag" },
  { value: "flag_review", label: "Flag For Review" },
];

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [message, setMessage] = useTimedMessage();

  const categoryLookup = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category.name])), [categories]);
  const enabledRuleCount = rules.filter((rule) => rule.isEnabled).length;
  const reviewRuleCount = rules.filter((rule) => rule.actions.some((action) => action.type === "flag_review")).length;

  async function loadData() {
    const [rulesResponse, categoriesResponse] = await Promise.all([
      api.get<Rule[]>("/rules"),
      api.get<Category[]>("/categories"),
    ]);

    setRules(rulesResponse.data);
    setCategories(categoriesResponse.data.filter((item) => !item.isArchived));
  }

  useEffect(() => {
    loadData().catch(() => setMessage("Failed to load rules."));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      name: form.name,
      isEnabled: form.isEnabled,
      priority: Number(form.priority),
      conditions: form.conditions,
      actions: form.actions.map((action) => ({
        ...action,
        value: action.type === "flag_review" ? null : action.value || null,
      })),
    };

    try {
      if (editingId) {
        await api.put(`/rules/${editingId}`, payload);
        setMessage("Rule updated successfully.");
      } else {
        await api.post("/rules", payload);
        setMessage("Rule created successfully.");
      }

      setForm(initialForm);
      setEditingId(null);
      setIsEditorOpen(false);
      await loadData();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to save rule.");
      } else {
        setMessage("Failed to save rule.");
      }
    }
  }

  async function removeRule(ruleId: string) {
    setMessage(null);

    try {
      await api.delete(`/rules/${ruleId}`);
      if (editingId === ruleId) {
        setEditingId(null);
        setForm(initialForm);
        setIsEditorOpen(false);
      }
      if (expandedRuleId === ruleId) {
        setExpandedRuleId(null);
      }
      setMessage("Rule deleted successfully.");
      await loadData();
    } catch {
      setMessage("Failed to delete rule.");
    }
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setIsEditorOpen(true);
    setForm({
      name: rule.name,
      isEnabled: rule.isEnabled,
      priority: String(rule.priority),
      conditions: rule.conditions.map((condition) => ({ ...condition })),
      actions: rule.actions.map((action) => ({ ...action, value: action.value ?? "" })),
    });
  }

  function updateCondition(index: number, nextValue: Partial<RuleConditionForm>) {
    setForm((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) =>
        conditionIndex === index
          ? {
              ...condition,
              ...nextValue,
              operator:
                nextValue.field && nextValue.field !== condition.field ? getDefaultOperator(nextValue.field) : nextValue.operator ?? condition.operator,
              value: nextValue.field && nextValue.field !== condition.field ? "" : nextValue.value ?? condition.value,
            }
          : condition),
    }));
  }

  function openCreateRule() {
    setEditingId(null);
    setForm(initialForm);
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setEditingId(null);
    setForm(initialForm);
    setIsEditorOpen(false);
  }

  function updateAction(index: number, nextValue: Partial<RuleActionForm>) {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action, actionIndex) =>
        actionIndex === index
          ? {
              ...action,
              ...nextValue,
              value: nextValue.type === "flag_review" ? "" : nextValue.value ?? action.value,
            }
          : action),
    }));
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Rules Engine"
        title="Automate categorization, tagging, and review flags"
        description="Build simple money automations that run when transactions are created. High-priority rules run first, fill in missing categories, add tags, and flag unusual activity for review."
      />

      <section className="rounded-xl2 border border-border bg-canvas p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Active Automations</h3>
            <p className="mt-1 text-sm text-ink/60">A compact control center for your live rules. Expand only the ones you want to inspect.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" onClick={openCreateRule} type="button">
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Total Rules</p>
            <p className="mt-3 text-2xl font-semibold text-ink">{rules.length}</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Enabled</p>
            <p className="mt-3 text-2xl font-semibold text-success">{enabledRuleCount}</p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Review Rules</p>
            <p className="mt-3 text-2xl font-semibold text-primary">{reviewRuleCount}</p>
          </article>
        </div>

        {message ? <p className="mt-4 text-sm text-ink/70">{message}</p> : null}

        <div className="mt-5 max-h-[760px] space-y-3 overflow-y-auto pr-1">
          {rules.length === 0 ? (
            <p className="text-sm text-ink/65">No rules yet. Create one to automate categorization and review workflows.</p>
          ) : (
            rules.map((rule) => {
              const isExpanded = expandedRuleId === rule.id;

              return (
                <article key={rule.id} className="surface-panel rounded-2xl border border-border/80 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{rule.name}</p>
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                            rule.isEnabled ? "bg-success/12 text-success" : "bg-ink/10 text-ink/55",
                          ].join(" ")}
                        >
                          {rule.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                        <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                          Priority {rule.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink/60">{buildRuleSummary(rule, categoryLookup)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-2xl border border-border px-3 py-2 text-sm font-semibold text-ink"
                        onClick={() => startEdit(rule)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-2xl bg-danger px-3 py-2 text-sm font-semibold text-white"
                        onClick={() => removeRule(rule.id)}
                        type="button"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </span>
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-semibold text-ink"
                        onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                        type="button"
                      >
                        {isExpanded ? "Hide" : "Details"}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">When</p>
                        <div className="mt-3 space-y-2">
                          {rule.conditions.map((condition, index) => (
                            <div key={`${condition.field}-${index}`} className="rounded-2xl bg-canvas px-3 py-3 text-sm leading-6 text-ink/75">
                              {formatCondition(condition, categoryLookup)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Do</p>
                        <div className="mt-3 space-y-2">
                          {rule.actions.map((action, index) => (
                            <div key={`${action.type}-${index}`} className="rounded-2xl bg-primary/8 px-3 py-3 text-sm leading-6 text-primary">
                              {formatAction(action, categoryLookup)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-xl2 border border-border bg-canvas p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">How This MVP Behaves</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Rules run on transaction create and update. They only auto-set a category when the transaction does not already have one, they merge tags without
              duplicates, and any matching review rule marks the transaction for follow-up.
            </p>
          </div>
        </div>
      </section>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/72 p-4 backdrop-blur-md">
          <div className="modal-panel my-auto flex max-h-[78vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl2 p-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{editingId ? "Edit Rule" : "New Rule"}</h3>
                  <p className="mt-1 text-sm text-ink/60">Keep rules focused and deterministic so outcomes stay predictable.</p>
                </div>
                <button className="rounded-2xl border border-border p-2 text-ink/65 transition hover:text-ink" onClick={closeEditor} type="button">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1" onSubmit={onSubmit}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/55">Rule Setup</p>
                </div>
                <label className="flex items-center gap-2 rounded-full bg-canvas px-3 py-2 text-sm font-medium text-ink">
                  <input
                    checked={form.isEnabled}
                    className="h-4 w-4 accent-primary"
                    onChange={(event) => setForm((current) => ({ ...current, isEnabled: event.target.checked }))}
                    type="checkbox"
                  />
                  Enabled
                </label>
              </div>

              <input
                className="w-full rounded-2xl border border-border px-4 py-3"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Auto-categorize food delivery"
                required
                value={form.name}
              />

              <input
                className="w-full rounded-2xl border border-border px-4 py-3"
                min="1"
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                placeholder="Priority"
                required
                type="number"
                value={form.priority}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/55">Conditions</h4>
                  <button
                    className="rounded-2xl border border-border px-3 py-2 text-sm font-semibold text-ink"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        conditions: [...current.conditions, { field: "merchant", operator: "contains", value: "" }],
                      }))
                    }
                    type="button"
                  >
                    Add Condition
                  </button>
                </div>

                {form.conditions.map((condition, index) => (
                  <div key={`${condition.field}-${index}`} className="grid gap-3 rounded-2xl border border-border/70 bg-canvas/60 p-4 md:grid-cols-[0.95fr_0.95fr_1.1fr_auto]">
                    <select
                      className="rounded-2xl border border-border px-4 py-3"
                      onChange={(event) => updateCondition(index, { field: event.target.value })}
                      value={condition.field}
                    >
                      {fieldOptions.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-2xl border border-border px-4 py-3"
                      onChange={(event) => updateCondition(index, { operator: event.target.value })}
                      value={condition.operator}
                    >
                      {getOperatorOptions(condition.field).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {condition.field === "type" ? (
                      <select
                        className="rounded-2xl border border-border px-4 py-3"
                        onChange={(event) => updateCondition(index, { value: event.target.value })}
                        value={condition.value}
                      >
                        <option value="">Select type</option>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    ) : condition.field === "category" ? (
                      <select
                        className="rounded-2xl border border-border px-4 py-3"
                        onChange={(event) => updateCondition(index, { value: event.target.value })}
                        value={condition.value}
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="rounded-2xl border border-border px-4 py-3"
                        onChange={(event) => updateCondition(index, { value: event.target.value })}
                        placeholder={condition.field === "amount" ? "15000" : "Swiggy"}
                        type={condition.field === "amount" ? "number" : "text"}
                        value={condition.value}
                      />
                    )}
                    <button
                      className="rounded-2xl bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={form.conditions.length === 1}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          conditions: current.conditions.filter((_, conditionIndex) => conditionIndex !== index),
                        }))
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/55">Actions</h4>
                  <button
                    className="rounded-2xl border border-border px-3 py-2 text-sm font-semibold text-ink"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        actions: [...current.actions, { type: "add_tag", value: "" }],
                      }))
                    }
                    type="button"
                  >
                    Add Action
                  </button>
                </div>

                {form.actions.map((action, index) => (
                  <div key={`${action.type}-${index}`} className="grid gap-3 rounded-2xl border border-border/70 bg-canvas/60 p-4 md:grid-cols-[1fr_1.2fr_auto]">
                    <select
                      className="rounded-2xl border border-border px-4 py-3"
                      onChange={(event) => updateAction(index, { type: event.target.value, value: "" })}
                      value={action.type}
                    >
                      {actionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {action.type === "set_category" ? (
                      <select
                        className="rounded-2xl border border-border px-4 py-3"
                        onChange={(event) => updateAction(index, { value: event.target.value })}
                        value={action.value}
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    ) : action.type === "add_tag" ? (
                      <input
                        className="rounded-2xl border border-border px-4 py-3"
                        onChange={(event) => updateAction(index, { value: event.target.value })}
                        placeholder="commute"
                        value={action.value}
                      />
                    ) : (
                      <div className="flex items-center rounded-2xl border border-border bg-canvas px-4 py-3 text-sm text-ink/65">
                        Marks matching transactions for review.
                      </div>
                    )}
                    <button
                      className="rounded-2xl bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={form.actions.length === 1}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          actions: current.actions.filter((_, actionIndex) => actionIndex !== index),
                        }))
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" type="submit">
                  {editingId ? "Save Rule" : "Create Rule"}
                </button>
                <button
                  className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-ink"
                  onClick={closeEditor}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getOperatorOptions(field: string) {
  if (field === "merchant") {
    return [
      { value: "contains", label: "contains" },
      { value: "equals", label: "equals" },
    ];
  }

  if (field === "amount") {
    return [
      { value: "greater_than", label: "greater than" },
      { value: "less_than", label: "less than" },
      { value: "equals", label: "equals" },
    ];
  }

  return [{ value: "equals", label: "equals" }];
}

function getDefaultOperator(field: string) {
  return getOperatorOptions(field)[0]?.value ?? "equals";
}

function formatCondition(condition: Rule["conditions"][number], categoryLookup: Record<string, string>) {
  if (condition.field === "category") {
    return `category equals ${categoryLookup[condition.value] ?? "selected category"}`;
  }

  return `${condition.field} ${condition.operator.replace(/_/g, " ")} ${condition.value}`;
}

function formatAction(action: Rule["actions"][number], categoryLookup: Record<string, string>) {
  if (action.type === "set_category") {
    return `set category to ${action.value ? categoryLookup[action.value] ?? "selected category" : "category"}`;
  }

  if (action.type === "add_tag") {
    return `add tag ${action.value}`;
  }

  return "flag for review";
}

function buildRuleSummary(rule: Rule, categoryLookup: Record<string, string>) {
  const conditionSummary = rule.conditions.map((condition) => formatCondition(condition, categoryLookup)).join(", ");
  const actionSummary = rule.actions.map((action) => formatAction(action, categoryLookup)).join(", ");
  return `When ${conditionSummary}, then ${actionSummary}.`;
}
