import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageIntro } from "@/components/ui/PageIntro";
import { useTimedMessage } from "@/hooks/useTimedMessage";
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
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useTimedMessage();

  const accountLookup = useMemo(() => Object.fromEntries(accounts.map((account) => [account.id, account.name])), [accounts]);
  const categoryLookup = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category.name])), [categories]);
  const editableAccounts = accounts.filter((account) => account.accessRole !== "viewer");

  async function loadMeta() {
    const [accountsResponse, categoriesResponse] = await Promise.all([
      api.get<Account[]>("/accounts"),
      api.get<Category[]>("/categories"),
    ]);

    setAccounts(accountsResponse.data);
    setCategories(categoriesResponse.data);

    const defaultAccount = accountsResponse.data.find((account) => account.accessRole !== "viewer");
    if (!form.accountId && defaultAccount) {
      setForm((current) => ({ ...current, accountId: defaultAccount.id }));
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
  const destinationAccounts = editableAccounts.filter((account) => account.id !== form.accountId);
  const accountFieldLabel = form.type === "transfer" ? "Source account" : form.type === "income" ? "Deposit to account" : "Pay from account";
  const merchantPlaceholder = form.type === "transfer" ? "Transfer note or label" : form.type === "income" ? "Received from" : "Merchant or payee";
  const smartSuggestions = useMemo(() => {
    const merchant = form.merchant.trim().toLowerCase();
    if (!merchant || form.type === "transfer") {
      return null;
    }

    const matches = transactions.filter((transaction) => {
      const candidate = transaction.merchant?.trim().toLowerCase() ?? "";
      return candidate.length > 0 && (candidate.includes(merchant) || merchant.includes(candidate)) && transaction.type === form.type;
    });

    if (matches.length === 0) {
      return null;
    }

    const categoryCounts = new Map<string, number>();
    const paymentMethodCounts = new Map<string, number>();
    const noteCounts = new Map<string, number>();

    matches.forEach((transaction) => {
      if (transaction.categoryId) {
        categoryCounts.set(transaction.categoryId, (categoryCounts.get(transaction.categoryId) ?? 0) + 1);
      }
      if (transaction.paymentMethod) {
        paymentMethodCounts.set(transaction.paymentMethod, (paymentMethodCounts.get(transaction.paymentMethod) ?? 0) + 1);
      }
      if (transaction.note) {
        noteCounts.set(transaction.note, (noteCounts.get(transaction.note) ?? 0) + 1);
      }
    });

    const mostFrequent = (entries: Map<string, number>) =>
      [...entries.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

    const suggestedCategoryId = mostFrequent(categoryCounts);
    const suggestedPaymentMethod = mostFrequent(paymentMethodCounts);
    const suggestedNote = mostFrequent(noteCounts);
    const averageAmount = Math.round(matches.reduce((total, transaction) => total + transaction.amount, 0) / matches.length);
    const recurringHint = isLikelyRecurring(matches);

    return {
      count: matches.length,
      suggestedCategoryId,
      suggestedPaymentMethod,
      suggestedNote,
      averageAmount,
      recurringHint,
    };
  }, [form.merchant, form.type, transactions]);

  useEffect(() => {
    if (!editableAccounts.length) {
      return;
    }

    setForm((current) => ({
      ...current,
      accountId: editableAccounts.some((account) => account.id === current.accountId) ? current.accountId : editableAccounts[0].id,
      destinationAccountId:
        current.type === "transfer" && current.destinationAccountId && editableAccounts.some((account) => account.id === current.destinationAccountId)
          ? current.destinationAccountId
          : "",
    }));
  }, [editableAccounts]);

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
    setIsDeleting(true);

    try {
      await api.delete(`/transactions/${transactionId}`);
      if (editingId === transactionId) {
        setEditingId(null);
        setForm(initialForm);
      }
      setPendingDelete(null);
      setMessage("Transaction deleted successfully.");
      await loadMeta();
      await loadTransactions();
    } catch {
      setMessage("Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
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

  function applySmartSuggestions() {
    if (!smartSuggestions) {
      return;
    }

    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || smartSuggestions.suggestedCategoryId || current.categoryId,
      paymentMethod: current.paymentMethod || smartSuggestions.suggestedPaymentMethod || current.paymentMethod,
      note: current.note || smartSuggestions.suggestedNote || current.note,
      amount: current.amount || (smartSuggestions.averageAmount ? smartSuggestions.averageAmount.toString() : current.amount),
    }));
    setMessage("Suggested fields applied.");
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
            className="rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
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
            data-empty={filters.accountId === "" ? "true" : "false"}
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
            data-empty={filters.categoryId === "" ? "true" : "false"}
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
            data-empty={filters.type === "" ? "true" : "false"}
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
            className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
            data-empty={form.type === "" ? "true" : "false"}
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
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
              data-empty={form.accountId === "" ? "true" : "false"}
              onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
              required
              value={form.accountId}
            >
              <option value="">{accountFieldLabel}</option>
              {editableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.isShared ? ` (${account.accessRole})` : ""}
                </option>
              ))}
            </select>
          </label>

          {form.type === "transfer" ? (
            <label className="block text-sm text-ink/75">
              Destination account
              <select
                className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
                data-empty={form.destinationAccountId === "" ? "true" : "false"}
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
                data-empty={form.categoryId === "" ? "true" : "false"}
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
            className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
            min="0.01"
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="Amount"
            required
            step="0.01"
            type="number"
            value={form.amount}
          />

          <input
            className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
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

          {smartSuggestions ? (
            <div className="premium-card-soft rounded-[1.2rem] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Smart suggestions available
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/62">
                    Found {smartSuggestions.count} similar {form.type} {smartSuggestions.count === 1 ? "entry" : "entries"} for this merchant.
                  </p>
                </div>
                <button className="premium-button premium-button-secondary rounded-xl px-3 py-2 text-xs" onClick={applySmartSuggestions} type="button">
                  Apply
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {smartSuggestions.suggestedCategoryId ? (
                  <div className="rounded-[1rem] border border-border/70 bg-white/60 px-3 py-2.5 text-sm text-ink/70">
                    Likely category: <span className="font-semibold text-ink">{categoryLookup[smartSuggestions.suggestedCategoryId] ?? "Category"}</span>
                  </div>
                ) : null}
                {smartSuggestions.suggestedPaymentMethod ? (
                  <div className="rounded-[1rem] border border-border/70 bg-white/60 px-3 py-2.5 text-sm text-ink/70">
                    Likely payment method: <span className="font-semibold text-ink">{smartSuggestions.suggestedPaymentMethod}</span>
                  </div>
                ) : null}
                {smartSuggestions.averageAmount > 0 ? (
                  <div className="rounded-[1rem] border border-border/70 bg-white/60 px-3 py-2.5 text-sm text-ink/70">
                    Typical amount: <span className="font-semibold text-ink">Rs {smartSuggestions.averageAmount.toLocaleString("en-IN")}</span>
                  </div>
                ) : null}
                {smartSuggestions.recurringHint ? (
                  <div className="rounded-[1rem] border border-border/70 bg-white/60 px-3 py-2.5 text-sm text-ink/70">
                    <span className="inline-flex items-center gap-2 font-semibold text-primary">
                      <Lightbulb className="h-4 w-4" />
                      Looks recurring
                    </span>
                    <p className="mt-1 text-sm text-ink/60">This merchant appears repeatedly. Consider creating a recurring item or rule.</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
            placeholder="Payment method"
            value={form.paymentMethod}
          />

          <textarea
            className="min-h-24 w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Recent Transactions</h3>
              <p className="mt-1 text-sm text-ink/60">Showing up to 100 entries in a denser, scrollable list.</p>
            </div>
            <p className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
              {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
            </p>
          </div>

          <div className="mt-5 max-h-[780px] space-y-2 overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-sm text-ink/65">No transactions matched your current filters.</p>
            ) : (
              transactions.map((transaction) => (
                <article key={transaction.id} className="surface-panel rounded-2xl border border-border/80 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{transaction.merchant || "Manual Entry"}</p>
                        <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink/55">
                          {transaction.type}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink/55">
                        {transaction.type} • {transaction.transactionDate} • {accountLookup[transaction.accountId] ?? "Account"}
                        {transaction.destinationAccountId ? ` → ${accountLookup[transaction.destinationAccountId] ?? "Account"}` : ""}
                      </p>
                      {transaction.createdByDisplayName ? (
                        <p className="mt-1 text-sm text-ink/55">Added by {transaction.createdByDisplayName}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-ink/55">
                        {transaction.categoryId ? categoryLookup[transaction.categoryId] ?? "Category" : "No category"}
                      </p>
                      {transaction.appliedRuleNames.length > 0 || transaction.needsReview ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {transaction.appliedRuleNames.map((ruleName) => (
                            <span key={ruleName} className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
                              Rule: {ruleName}
                            </span>
                          ))}
                          {transaction.needsReview ? (
                            <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">Needs review</span>
                          ) : null}
                        </div>
                      ) : null}
                      {transaction.note ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">{transaction.note}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3 lg:min-w-[180px] lg:items-end">
                      <p
                        className={
                          transaction.type === "income"
                            ? "text-base font-semibold text-success"
                            : transaction.type === "expense"
                              ? "text-base font-semibold text-danger"
                              : "text-base font-semibold text-primary"
                        }
                      >
                        {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}Rs{" "}
                        {transaction.amount.toLocaleString("en-IN")}
                      </p>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          className="rounded-2xl border border-border px-3 py-1.5 text-sm font-semibold text-ink"
                          onClick={() => startEdit(transaction)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-2xl bg-danger px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                          onClick={() => setPendingDelete(transaction)}
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

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 backdrop-blur-md">
          <div className="modal-panel w-full max-w-md rounded-[1.6rem] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/12 text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-ink">Delete this transaction?</h3>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  This will permanently remove{" "}
                  <span className="font-semibold text-ink">
                    {pendingDelete.merchant || "this transaction"}
                  </span>{" "}
                  for Rs {pendingDelete.amount.toLocaleString("en-IN")} from your records.
                </p>
                <p className="mt-2 text-sm text-ink/55">
                  {pendingDelete.transactionDate} • {pendingDelete.type}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="premium-button premium-button-secondary text-sm"
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="premium-button rounded-2xl bg-danger px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => deleteTransaction(pendingDelete.id)}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete Transaction"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function isLikelyRecurring(matches: Transaction[]) {
  if (matches.length < 3) {
    return false;
  }

  const dates = matches
    .map((transaction) => new Date(transaction.transactionDate))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  if (dates.length < 3) {
    return false;
  }

  const intervals = [];
  for (let index = 1; index < dates.length; index += 1) {
    intervals.push(Math.round((dates[index].getTime() - dates[index - 1].getTime()) / (1000 * 60 * 60 * 24)));
  }

  const monthlyLikeIntervals = intervals.filter((days) => days >= 24 && days <= 38).length;
  return monthlyLikeIntervals >= 2;
}
