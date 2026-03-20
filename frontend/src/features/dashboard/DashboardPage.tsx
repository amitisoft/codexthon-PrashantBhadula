import { useEffect, useState } from "react";
import { BarChart3, Landmark, PiggyBank, ReceiptText } from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageIntro } from "@/components/ui/PageIntro";
import { api } from "@/services/api";
import type { DashboardSummary } from "@/types/api";

const chartColors = ["#244B66", "#4C8A87", "#CC9C4B", "#C4665E", "#6D7E91", "#5C7A62"];

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>("/dashboard/summary")
      .then((response) => setSummary(response.data))
      .catch(() => setMessage("Dashboard data is not available right now."));
  }, []);

  const metrics = summary
    ? [
        {
          label: "Net Balance",
          value: `Rs ${summary.metrics.netBalance.toLocaleString("en-IN")}`,
          detail: `${summary.metrics.accountCount} accounts connected`,
          icon: Landmark,
        },
        {
          label: "This Month Income",
          value: `Rs ${summary.metrics.currentMonthIncome.toLocaleString("en-IN")}`,
          detail: `${summary.metrics.transactionCount} transactions recorded`,
          icon: ReceiptText,
        },
        {
          label: "This Month Expense",
          value: `Rs ${summary.metrics.currentMonthExpense.toLocaleString("en-IN")}`,
          detail: `${summary.metrics.activeBudgetCount} active budgets`,
          icon: BarChart3,
        },
        {
          label: "Active Goals",
          value: `${summary.metrics.activeGoalCount}`,
          detail: "Savings plans in progress",
          icon: PiggyBank,
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Dashboard"
        title="Your financial picture at a glance"
        description="This dashboard reflects your live data. It highlights current month totals, category spend, budget health, upcoming recurring bills, savings goals, and a simple income-versus-expense trend."
      />

      {message ? <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink/70">{message}</p> : null}

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((card) => {
              const Icon = card.icon;

              return (
                <article key={card.label} className="rounded-xl2 border border-border bg-canvas p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink/60">{card.label}</p>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-primary">{card.value}</p>
                  <p className="mt-3 text-sm leading-6 text-ink/65">{card.detail}</p>
                </article>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Current month spending by category</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.categorySpend} dataKey="amount" nameKey="categoryName" innerRadius={60} outerRadius={95}>
                      {summary.categorySpend.map((entry, index) => (
                        <Cell key={entry.categoryName} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`Rs ${value.toLocaleString("en-IN")}`, "Spent"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Simple income vs expense trend</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.trend}>
                    <Tooltip formatter={(value: number) => `Rs ${value.toLocaleString("en-IN")}`} />
                    <Line type="monotone" dataKey="income" stroke="#4C8B68" strokeWidth={3} />
                    <Line type="monotone" dataKey="expense" stroke="#C4665E" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-xl2 border border-border bg-canvas p-6">
              <h3 className="text-lg font-semibold">Budget vs actual</h3>
              <div className="mt-5 space-y-4">
                {summary.budgetProgress.length === 0 ? (
                  <p className="text-sm text-ink/65">No budgets yet. Create one to start tracking category spend.</p>
                ) : (
                  summary.budgetProgress.map((budget) => (
                    <article key={budget.budgetId} className="rounded-2xl bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-ink">{budget.categoryName}</p>
                        <p className="text-sm text-ink/55">
                          Rs {budget.spentAmount.toLocaleString("en-IN")} / Rs {budget.budgetAmount.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="mt-3 h-3 rounded-full bg-border">
                        <div
                          className={budget.status === "over" ? "h-3 rounded-full bg-danger" : budget.status === "warning" ? "h-3 rounded-full bg-warning" : "h-3 rounded-full bg-success"}
                          style={{ width: `${Math.min(budget.progressPercent, 100)}%` }}
                        />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="space-y-4">
              <article className="rounded-xl2 border border-border bg-canvas p-6">
                <h3 className="text-lg font-semibold">Upcoming bills</h3>
                <div className="mt-4 space-y-3">
                  {summary.upcomingRecurring.length === 0 ? (
                    <p className="text-sm text-ink/65">No recurring bills yet. Add subscriptions or rent reminders.</p>
                  ) : (
                    summary.upcomingRecurring.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white p-4">
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 text-sm text-ink/55">
                          {item.nextRunDate} • {item.frequency}
                        </p>
                        <p className="mt-2 text-sm font-medium text-danger">Rs {item.amount.toLocaleString("en-IN")}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl2 border border-border bg-canvas p-6">
                <h3 className="text-lg font-semibold">Savings goals</h3>
                <div className="mt-4 space-y-3">
                  {summary.goals.length === 0 ? (
                    <p className="text-sm text-ink/65">No goals yet. Create one to track long-term savings.</p>
                  ) : (
                    summary.goals.map((goal) => (
                      <div key={goal.goalId} className="rounded-2xl bg-white p-4">
                        <p className="font-semibold text-ink">{goal.name}</p>
                        <p className="mt-1 text-sm text-ink/55">
                          Rs {goal.currentAmount.toLocaleString("en-IN")} / Rs {goal.targetAmount.toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          </div>

          <section className="rounded-xl2 border border-border bg-canvas p-6">
            <h3 className="text-lg font-semibold">Recent transactions</h3>
            <div className="mt-4 space-y-3">
              {summary.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{transaction.merchant}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        {transaction.transactionDate} • {transaction.accountName ?? "Account"} • {transaction.categoryName ?? "Category"}
                      </p>
                    </div>
                    <p className={transaction.type === "income" ? "font-semibold text-success" : "font-semibold text-danger"}>
                      {transaction.type === "income" ? "+" : "-"}Rs {transaction.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
