import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { PageIntro } from "@/components/ui/PageIntro";
import { api } from "@/services/api";
import type { Budget, Category } from "@/types/api";

const now = new Date();

const initialForm = {
  categoryId: "",
  amount: "",
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  alertThresholdPercent: "80",
};

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [categoriesResponse, budgetsResponse] = await Promise.all([
      api.get<Category[]>("/categories"),
      api.get<Budget[]>(`/budgets?month=${form.month}&year=${form.year}`),
    ]);

    setCategories(categoriesResponse.data.filter((item) => item.type === "expense"));
    setBudgets(budgetsResponse.data);
  }

  useEffect(() => {
    loadData().catch(() => setMessage("Failed to load budgets."));
  }, [form.month, form.year]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      await api.post("/budgets", {
        ...form,
        amount: Number(form.amount),
        month: Number(form.month),
        year: Number(form.year),
        alertThresholdPercent: Number(form.alertThresholdPercent),
      });

      setForm((current) => ({ ...current, categoryId: "", amount: "" }));
      setMessage("Budget saved successfully.");
      await loadData();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to save budget.");
      } else {
        setMessage("Failed to save budget.");
      }
    }
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Budgets"
        title="Compare budget vs actual spending"
        description="Budgets are live now. Set a category budget for the month and Fitra will compare it against your real expense transactions."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onSubmit}>
          <h3 className="text-xl font-semibold">Set Monthly Budget</h3>

          <select
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            required
            value={form.categoryId}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="Budget amount"
            required
            type="number"
            value={form.amount}
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
              placeholder="Month"
              required
              type="number"
              value={form.month}
            />
            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
              placeholder="Year"
              required
              type="number"
              value={form.year}
            />
          </div>

          {message ? <p className="text-sm text-ink/70">{message}</p> : null}

          <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" type="submit">
            Save Budget
          </button>
        </form>

        <section className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold">Budget Progress</h3>
          <div className="mt-5 space-y-4">
            {budgets.length === 0 ? (
              <p className="text-sm text-ink/65">No budgets for this month yet.</p>
            ) : (
              budgets.map((budget) => (
                <article key={budget.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{budget.categoryName}</p>
                    <p className="text-sm text-ink/55">
                      Rs {budget.spentAmount.toLocaleString("en-IN")} / Rs {budget.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-border">
                    <div
                      className={budget.status === "over" ? "h-3 rounded-full bg-danger" : budget.status === "warning" ? "h-3 rounded-full bg-warning" : "h-3 rounded-full bg-success"}
                      style={{ width: `${Math.min(budget.progressPercent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-ink/60">
                    Remaining: Rs {budget.remainingAmount.toLocaleString("en-IN")}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
