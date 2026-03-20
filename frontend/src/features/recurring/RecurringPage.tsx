import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { PageIntro } from "@/components/ui/PageIntro";
import { api } from "@/services/api";
import type { Account, Category, RecurringTransaction } from "@/types/api";

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  title: "",
  type: "expense",
  amount: "",
  categoryId: "",
  accountId: "",
  frequency: "monthly",
  startDate: today,
  endDate: "",
  nextRunDate: today,
  autoCreateTransaction: false,
};

export function RecurringPage() {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [itemsResponse, accountsResponse, categoriesResponse] = await Promise.all([
      api.get<RecurringTransaction[]>("/recurring"),
      api.get<Account[]>("/accounts"),
      api.get<Category[]>("/categories"),
    ]);

    setItems(itemsResponse.data);
    setAccounts(accountsResponse.data);
    setCategories(categoriesResponse.data.filter((item) => item.type === form.type));
  }

  useEffect(() => {
    loadData().catch(() => setMessage("Failed to load recurring items."));
  }, [form.type]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      await api.post("/recurring", {
        ...form,
        amount: Number(form.amount),
        categoryId: form.categoryId || null,
        accountId: form.accountId || null,
        endDate: form.endDate || null,
        nextRunDate: form.nextRunDate || null,
      });

      setForm(initialForm);
      setMessage("Recurring item created successfully.");
      await loadData();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to create recurring item.");
      } else {
        setMessage("Failed to create recurring item.");
      }
    }
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Recurring"
        title="Identify upcoming bills and repeating payments"
        description="Recurring rules are live now. Add subscriptions, salaries, rent, or bills so Fitra can surface what’s due next."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onSubmit}>
          <h3 className="text-xl font-semibold">New Recurring Item</h3>

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Netflix"
            required
            value={form.title}
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value, categoryId: "" }))}
              value={form.type}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="Amount"
              required
              type="number"
              value={form.amount}
            />
          </div>

          <select
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            value={form.categoryId}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
            value={form.accountId}
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}
              value={form.frequency}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, nextRunDate: event.target.value }))}
              type="date"
              value={form.nextRunDate}
            />
          </div>

          {message ? <p className="text-sm text-ink/70">{message}</p> : null}

          <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" type="submit">
            Save Recurring Item
          </button>
        </form>

        <section className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold">Upcoming Recurring Payments</h3>
          <div className="mt-5 space-y-4">
            {items.length === 0 ? (
              <p className="text-sm text-ink/65">No recurring items yet. Add your first subscription or bill.</p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        {item.frequency} • next due {item.nextRunDate}
                      </p>
                    </div>
                    <p className="font-semibold text-danger">Rs {item.amount.toLocaleString("en-IN")}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
