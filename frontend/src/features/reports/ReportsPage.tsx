import axios from "axios";
import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageIntro } from "@/components/ui/PageIntro";
import { api } from "@/services/api";
import type { Account, Category, ReportsSummary } from "@/types/api";

const now = new Date();
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
const today = new Date().toISOString().slice(0, 10);
const chartColors = ["#244B66", "#4C8A87", "#CC9C4B", "#C4665E", "#6D7E91", "#5C7A62"];

const initialFilters = {
  from: thisMonthStart,
  to: today,
  accountId: "",
  categoryId: "",
  type: "",
};

export function ReportsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadMeta() {
    const [accountsResponse, categoriesResponse] = await Promise.all([
      api.get<Account[]>("/accounts"),
      api.get<Category[]>("/categories"),
    ]);

    setAccounts(accountsResponse.data);
    setCategories(categoriesResponse.data);
  }

  async function loadSummary(activeFilters = filters) {
    const params = {
      from: activeFilters.from || undefined,
      to: activeFilters.to || undefined,
      accountId: activeFilters.accountId || undefined,
      categoryId: activeFilters.categoryId || undefined,
      type: activeFilters.type || undefined,
    };

    const { data } = await api.get<ReportsSummary>("/reports/summary", { params });
    setSummary(data);
  }

  useEffect(() => {
    Promise.all([loadMeta(), loadSummary()]).catch(() => setMessage("Failed to load reports."));
  }, []);

  async function exportCsv() {
    setMessage(null);

    try {
      const response = await api.get("/reports/export/csv", {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          accountId: filters.accountId || undefined,
          categoryId: filters.categoryId || undefined,
          type: filters.type || undefined,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fitra-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("CSV export downloaded.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to export CSV.");
      } else {
        setMessage("Failed to export CSV.");
      }
    }
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Reports"
        title="Turn raw transactions into patterns you can act on"
        description="Filter by date, account, category, and type to review category concentration, month-over-month movement, and the exact transactions behind the numbers. Export the active view any time."
      />

      <section className="rounded-xl2 border border-border bg-canvas p-6">
        <div className="grid gap-4 lg:grid-cols-5">
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
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white"
            onClick={() => loadSummary(filters).catch(() => setMessage("Failed to refresh reports."))}
            type="button"
          >
            Apply Filters
          </button>
          <button
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-ink"
            onClick={() => {
              setFilters(initialFilters);
              loadSummary(initialFilters).catch(() => setMessage("Failed to reset reports."));
            }}
            type="button"
          >
            Reset
          </button>
          <button className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white" onClick={exportCsv} type="button">
            Download CSV
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-ink/70">{message}</p> : null}
      </section>

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl2 border border-border bg-canvas p-5">
              <p className="text-sm text-ink/60">Income</p>
              <p className="mt-4 text-3xl font-semibold text-success">Rs {summary.totals.income.toLocaleString("en-IN")}</p>
            </article>
            <article className="rounded-xl2 border border-border bg-canvas p-5">
              <p className="text-sm text-ink/60">Expense</p>
              <p className="mt-4 text-3xl font-semibold text-danger">Rs {summary.totals.expense.toLocaleString("en-IN")}</p>
            </article>
            <article className="rounded-xl2 border border-border bg-canvas p-5">
              <p className="text-sm text-ink/60">Net</p>
              <p className="mt-4 text-3xl font-semibold text-primary">Rs {summary.totals.net.toLocaleString("en-IN")}</p>
            </article>
            <article className="rounded-xl2 border border-border bg-canvas p-5">
              <p className="text-sm text-ink/60">Transactions</p>
              <p className="mt-4 text-3xl font-semibold text-ink">{summary.totals.transactionCount}</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Category Breakdown</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.categorySpend}>
                    <XAxis dataKey="categoryName" hide />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => `Rs ${value.toLocaleString("en-IN")}`} />
                    <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                      {summary.categorySpend.map((entry, index) => (
                        <Cell key={entry.categoryName} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Income vs Expense Trend</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.trend}>
                    <XAxis dataKey="periodLabel" />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => `Rs ${value.toLocaleString("en-IN")}`} />
                    <Line dataKey="income" stroke="#4C8B68" strokeWidth={3} type="monotone" />
                    <Line dataKey="expense" stroke="#C4665E" strokeWidth={3} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Account Balances</h3>
              <div className="mt-4 space-y-3">
                {summary.accountBalances.map((account) => (
                  <article key={account.accountId} className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">{account.accountName}</p>
                      <p className="text-lg font-semibold text-primary">Rs {account.currentBalance.toLocaleString("en-IN")}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Filtered Transactions</h3>
              <div className="mt-4 space-y-3">
                {summary.transactions.length === 0 ? (
                  <p className="text-sm text-ink/65">No transactions matched the current filters.</p>
                ) : (
                  summary.transactions.map((transaction) => (
                    <article key={transaction.id} className="rounded-2xl bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-ink">{transaction.merchant}</p>
                          <p className="mt-1 text-sm text-ink/55">
                            {transaction.transactionDate} • {transaction.accountName} • {transaction.categoryName ?? "No category"}
                          </p>
                          {transaction.note ? <p className="mt-2 text-sm text-ink/60">{transaction.note}</p> : null}
                        </div>
                        <p className={transaction.type === "income" ? "text-lg font-semibold text-success" : transaction.type === "expense" ? "text-lg font-semibold text-danger" : "text-lg font-semibold text-primary"}>
                          {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}Rs{" "}
                          {transaction.amount.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
