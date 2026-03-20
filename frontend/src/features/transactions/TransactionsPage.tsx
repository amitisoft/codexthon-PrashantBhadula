import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageIntro } from "@/components/ui/PageIntro";
import { api } from "@/services/api";
import type { Account, Category, Transaction } from "@/types/api";

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  accountId: "",
  destinationAccountId: "",
  categoryId: "",
  type: "expense",
  amount: "",
  transactionDate: today,
  merchant: "",
  note: "",
  paymentMethod: "",
  search: "",
};

const initialFilters = {
  from: "",
  to: "",
  accountId: "",
  categoryId: "",
  type: "",
  search: "",
};

export function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    search: searchParams.get("search") ?? "",
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const accountLookup = useMemo(() => Object.fromEntries(accounts.map((account) => [account.id, account.name])), [accounts]);
  const categoryLookup = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category.name])), [categories]);

  async function loadMeta() {
    const [accountsResponse, categoriesResponse] = await Promise.all([
      api.get<Account[]>("/accounts"),
      api.get<Category[]>("/categories"),
    ]);

    setAccounts(accountsResponse.data);
    setCategories(categoriesResponse.data);

    if (!form.accountId && accountsResponse.data[0]) {
      setForm((current) => ({ ...current, accountId: accountsResponse.data[0].id }));
    }
  }

  async function loadTransactions(activeFilters = filters) {
    const { data } = await api.get<Transaction[]>("/transactions", {
      params: {
        from: activeFilters.from || undefined,
        to: activeFilters.to || undefined,
        accountId: activeFilters.accountId || undefined,
        categoryId: activeFilters.categoryId || undefined,
        type: activeFilters.type || undefined,
        search: activeFilters.search || undefined,
      },
    });

    setTransactions(data);
  }

  useEffect(() => {
    Promise.all([loadMeta(), loadTransactions()]).catch(() => setMessage("Failed to load transaction data."));
  }, []);

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextFilters = { ...initialFilters, search: nextSearch };
    setFilters(nextFilters);
    loadTransactions(nextFilters).catch(() => setMessage("Failed to load transaction data."));
  }, [searchParams]);

  const filteredCategories = categories.filter((category) => category.type === form.type);
  const destinationAccounts = accounts.filter((account) => account.id !== form.accountId);
  const accountFieldLabel = form.type === "transfer" ? "Source account" : form.type === "income" ? "Deposit to account" : "Pay from account";
  const merchantPlaceholder = form.type === "transfer" ? "Transfer note or label" : form.type === "income" ? "Received from" : "Merchant or payee";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      accountId: form.accountId,
      destinationAccountId: form.type === "transfer" ? form.destinationAccountId || null : null,
      categoryId: form.type === "transfer" ? null : form.categoryId || null,
      type: form.type,
      amount: Number(form.amount),
      transactionDate: form.transactionDate,
      merchant: form.merchant || null,
      note: form.note || null,
      paymentMethod: form.paymentMethod || null,
      tags: [],
    };

    try {
      if (editingId) {
        await api.put(`/transactions/${editingId}`, payload);
        setMessage("Transaction updated successfully.");
      } else {
        await api.post("/transactions", payload);
        setMessage("Transaction saved successfully.");
      }

      setEditingId(null);
      setForm((current) => ({
        ...initialForm,
        accountId: current.accountId,
      }));
      await loadMeta();
      await loadTransactions();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to save transaction.");
      } else {
        setMessage("Failed to save transaction.");
      }
    }
  }

  async function deleteTransaction(transactionId: string) {
    setMessage(null);

    try {
      await api.delete(`/transactions/${transactionId}`);
      if (editingId === transactionId) {
        setEditingId(null);
        setForm(initialForm);
      }
      setMessage("Transaction deleted successfully.");
      await loadMeta();
      await loadTransactions();
    } catch {
      setMessage("Failed to delete transaction.");
    }
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({
      accountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId ?? "",
      categoryId: transaction.categoryId ?? "",
      type: transaction.type,
      amount: transaction.amount.toString(),
      transactionDate: transaction.transactionDate,
      merchant: transaction.merchant ?? "",
      note: transaction.note ?? "",
      paymentMethod: transaction.paymentMethod ?? "",
      search: "",
    });
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Transactions"
        title="Track income, expenses, and transfers without losing control"
        description="This screen now supports full CRUD, search, and filters. You can correct mistakes, remove bad entries, and move money between accounts while balances stay in sync."
      />

      <section className="rounded-xl2 border border-border bg-canvas p-6">
        <div className="grid gap-4 lg:grid-cols-6">
          <input
            className="rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            type="date"
            value={filters.from}
          />
          <input
            className="rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            type="date"
            value={filters.to}
          />
          <select
            className="rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setFilters((current) => ({ ...current, accountId: event.target.value }))}
            value={filters.accountId}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
            value={filters.categoryId}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            value={filters.type}
          >
            <option value="">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
          <input
            className="rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search merchant or note"
            value={filters.search}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white"
            onClick={() => loadTransactions(filters).catch(() => setMessage("Failed to refresh transactions."))}
            type="button"
          >
            Apply Filters
          </button>
          <button
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-ink"
            onClick={() => {
              setFilters(initialFilters);
              loadTransactions(initialFilters).catch(() => setMessage("Failed to reset transactions."));
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onSubmit}>
          <h3 className="text-xl font-semibold">{editingId ? "Edit Transaction" : "New Transaction"}</h3>

          <select
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value,
                categoryId: "",
                destinationAccountId: "",
              }))
            }
            value={form.type}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>

          <label className="block text-sm text-ink/75">
            {accountFieldLabel}
            <select
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
              required
              value={form.accountId}
            >
              <option value="">{accountFieldLabel}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          {form.type === "transfer" ? (
            <label className="block text-sm text-ink/75">
              Destination account
              <select
                className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
                onChange={(event) => setForm((current) => ({ ...current, destinationAccountId: event.target.value }))}
                required
                value={form.destinationAccountId}
              >
                <option value="">Destination account</option>
                {destinationAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm text-ink/75">
              Category
              <select
                className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
                onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                required={form.type !== "transfer"}
                value={form.categoryId}
              >
                <option value="">Select category</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            min="0.01"
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="Amount"
            required
            step="0.01"
            type="number"
            value={form.amount}
          />

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, transactionDate: event.target.value }))}
            required
            type="date"
            value={form.transactionDate}
          />

          <label className="block text-sm text-ink/75">
            {form.type === "transfer" ? "Transfer label" : form.type === "income" ? "Received from" : "Merchant / payee"}
            <input
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, merchant: event.target.value }))}
              placeholder={merchantPlaceholder}
              value={form.merchant}
            />
          </label>

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
            placeholder="Payment method"
            value={form.paymentMethod}
          />

          <textarea
            className="min-h-24 w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Note"
            value={form.note}
          />

          {message ? <p className="text-sm text-ink/70">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" type="submit">
              {editingId ? "Save Changes" : "Save Transaction"}
            </button>
            {editingId ? (
              <button
                className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-ink"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
                type="button"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <section className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold">Recent Transactions</h3>
          <div className="mt-5 space-y-3">
            {transactions.length === 0 ? (
              <p className="text-sm text-ink/65">No transactions matched your current filters.</p>
            ) : (
              transactions.map((transaction) => (
                <article key={transaction.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{transaction.merchant || "Manual Entry"}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        {transaction.type} • {transaction.transactionDate} • {accountLookup[transaction.accountId] ?? "Account"}
                        {transaction.destinationAccountId ? ` → ${accountLookup[transaction.destinationAccountId] ?? "Account"}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-ink/55">
                        {transaction.categoryId ? categoryLookup[transaction.categoryId] ?? "Category" : "No category"}
                      </p>
                      {transaction.note ? <p className="mt-2 text-sm text-ink/60">{transaction.note}</p> : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={
                          transaction.type === "income"
                            ? "text-lg font-semibold text-success"
                            : transaction.type === "expense"
                              ? "text-lg font-semibold text-danger"
                              : "text-lg font-semibold text-primary"
                        }
                      >
                        {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}Rs{" "}
                        {transaction.amount.toLocaleString("en-IN")}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="rounded-2xl border border-border px-3 py-2 text-sm font-semibold text-ink"
                          onClick={() => startEdit(transaction)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-2xl bg-ink px-3 py-2 text-sm font-semibold text-white"
                          onClick={() => deleteTransaction(transaction.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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
