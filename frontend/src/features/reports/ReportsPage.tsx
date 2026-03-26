import axios from "axios";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageIntro } from "@/components/ui/PageIntro";
import { useTimedMessage } from "@/hooks/useTimedMessage";
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
  const [message, setMessage] = useTimedMessage();

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

  async function exportPdf() {
    setMessage(null);

    if (!summary) {
      setMessage("Load a report first before downloading PDF.");
      return;
    }

    try {
      const lines = [
        "Fitra Report Summary",
        `Period: ${filters.from || "Start"} to ${filters.to || "Today"}`,
        "",
        `Income: Rs ${summary.totals.income.toLocaleString("en-IN")}`,
        `Expense: Rs ${summary.totals.expense.toLocaleString("en-IN")}`,
        `Net: Rs ${summary.totals.net.toLocaleString("en-IN")}`,
        `Transactions: ${summary.totals.transactionCount}`,
        "",
        "Top Insights",
        ...summary.insights.slice(0, 3).map((insight, index) => `${index + 1}. ${insight.title}: ${insight.body}`),
        "",
        "Top Categories",
        ...summary.categorySpend.slice(0, 5).map((category) => `- ${category.categoryName}: Rs ${category.amount.toLocaleString("en-IN")}`),
        "",
        "Account Balances",
        ...summary.accountBalances.slice(0, 5).map((account) => `- ${account.accountName}: Rs ${account.currentBalance.toLocaleString("en-IN")}`),
      ];

      const blob = createSimplePdfBlob(lines);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fitra-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("PDF export downloaded.");
    } catch {
      setMessage("Failed to export PDF.");
    }
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Reports & Insights"
        title="See what changed, why it changed, and where to act next"
        description="Advanced reporting now goes beyond totals. Track net worth direction, savings rate movement, category shifts, and narrative insight cards that explain your recent money patterns."
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
          <button className="rounded-2xl bg-primary-soft px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90" onClick={exportCsv} type="button">
            Download CSV
          </button>
          <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90" onClick={exportPdf} type="button">
            Download PDF
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-ink/70">{message}</p> : null}
      </section>

      {summary ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {summary.insights.map((insight) => (
              <article key={insight.title} className="rounded-xl2 border border-border bg-canvas p-5">
                <p
                  className={[
                    "text-xs font-semibold uppercase tracking-[0.2em]",
                    insight.tone === "positive" ? "text-success" : insight.tone === "caution" ? "text-warning" : "text-primary",
                  ].join(" ")}
                >
                  Insight
                </p>
                <h3 className="mt-3 text-lg font-semibold text-ink">{insight.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/65">{insight.body}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Income" tone="success" value={`Rs ${summary.totals.income.toLocaleString("en-IN")}`} />
            <MetricCard label="Expense" tone="danger" value={`Rs ${summary.totals.expense.toLocaleString("en-IN")}`} />
            <MetricCard label="Net" tone="primary" value={`Rs ${summary.totals.net.toLocaleString("en-IN")}`} />
            <MetricCard label="Transactions" tone="default" value={`${summary.totals.transactionCount}`} />
          </div>

          <section className="rounded-xl2 border border-border bg-canvas p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Month-over-month comparison</h3>
                <p className="mt-1 text-sm text-ink/60">
                  {summary.monthComparison.currentPeriodLabel} versus {summary.monthComparison.previousPeriodLabel}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ComparisonCard
                label="Income change"
                currentValue={summary.monthComparison.currentIncome}
                previousValue={summary.monthComparison.previousIncome}
                format="currency"
              />
              <ComparisonCard
                label="Expense change"
                currentValue={summary.monthComparison.currentExpense}
                previousValue={summary.monthComparison.previousExpense}
                format="currency"
              />
              <ComparisonCard
                label="Savings rate"
                currentValue={summary.monthComparison.currentSavingsRate}
                previousValue={summary.monthComparison.previousSavingsRate}
                format="percent"
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {summary.monthComparison.categoryChanges.map((item) => (
                <article key={item.categoryName} className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{item.categoryName}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        Now Rs {item.currentAmount.toLocaleString("en-IN")} • Before Rs {item.previousAmount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <p className={item.changeAmount >= 0 ? "text-sm font-semibold text-danger" : "text-sm font-semibold text-success"}>
                      {item.changeAmount >= 0 ? "+" : "-"}Rs {Math.abs(item.changeAmount).toLocaleString("en-IN")}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Income vs expense trend</h3>
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

            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Estimated net worth trend</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.netWorthTrend}>
                    <XAxis dataKey="periodLabel" />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => `Rs ${value.toLocaleString("en-IN")}`} />
                    <Area dataKey="netWorth" fill="rgba(36,75,102,0.16)" stroke="#244B66" strokeWidth={3} type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-xl2 border border-border bg-canvas p-6">
            <h3 className="text-lg font-semibold">Account balance trend</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.accountBalanceTrend[0]?.points ?? []}>
                  <XAxis dataKey="periodLabel" type="category" allowDuplicatedCategory={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value: number) => `Rs ${value.toLocaleString("en-IN")}`} />
                  {summary.accountBalanceTrend.map((series, index) => (
                    <Line
                      key={series.accountId}
                      data={series.points}
                      dataKey="balance"
                      name={series.accountName}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={3}
                      type="monotone"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Category breakdown</h3>
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
              <h3 className="text-lg font-semibold">Savings rate trend</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.savingsRateTrend}>
                    <XAxis dataKey="periodLabel" />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                    <Area dataKey="savingsRatePercent" fill="rgba(76,138,135,0.18)" stroke="#4C8A87" strokeWidth={3} type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Account balances</h3>
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
              <h3 className="text-lg font-semibold">Filtered transactions</h3>
              <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
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

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "success" | "danger" | "primary" | "default";
  value: string;
}) {
  return (
    <article className="rounded-xl2 border border-border bg-canvas p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p
        className={[
          "mt-4 text-3xl font-semibold",
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "primary" ? "text-primary" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
    </article>
  );
}

function ComparisonCard({
  label,
  currentValue,
  previousValue,
  format,
}: {
  label: string;
  currentValue: number;
  previousValue: number;
  format: "currency" | "percent";
}) {
  const delta = currentValue - previousValue;
  const isPositive = delta >= 0;

  return (
    <article className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-3 text-xl font-semibold text-ink">{formatValue(currentValue, format)}</p>
      <p className={["mt-2 text-sm font-semibold", isPositive ? "text-success" : "text-danger"].join(" ")}>
        {isPositive ? "+" : "-"}
        {formatValue(Math.abs(delta), format)} vs prior month
      </p>
    </article>
  );
}

function formatValue(value: number, format: "currency" | "percent") {
  if (format === "percent") {
    return `${value.toFixed(1)}%`;
  }

  return `Rs ${value.toLocaleString("en-IN")}`;
}

function createSimplePdfBlob(lines: string[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 50;
  const top = 790;
  const lineHeight = 18;
  const fontSize = 12;

  const contentLines = lines.flatMap((line) => wrapText(line, 72));
  const contentStream = [
    "BT",
    `/F1 ${fontSize} Tf`,
    `${left} ${top} Td`,
    ...contentLines.map((line, index) => `${index === 0 ? "" : `0 -${lineHeight} Td `}(${escapePdfText(line)}) Tj`).filter(Boolean),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefPosition = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return [value];
  }

  const words = value.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxChars) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
