import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { PageIntro } from "@/components/ui/PageIntro";
import { useTimedMessage } from "@/hooks/useTimedMessage";
import { api } from "@/services/api";
import type { Account, Goal } from "@/types/api";

const initialForm = {
  name: "",
  targetAmount: "",
  currentAmount: "0",
  targetDate: "",
  linkedAccountId: "",
  icon: "shield",
  color: "#4C8A87",
};

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useTimedMessage();
  const [contributionAmounts, setContributionAmounts] = useState<Record<string, string>>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});
  const editableAccounts = accounts.filter((account) => account.accessRole !== "viewer");

  async function loadData() {
    const [goalsResponse, accountsResponse] = await Promise.all([
      api.get<Goal[]>("/goals"),
      api.get<Account[]>("/accounts"),
    ]);

    setGoals(goalsResponse.data);
    setAccounts(accountsResponse.data);
  }

  useEffect(() => {
    loadData().catch(() => setMessage("Failed to load goals."));
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      await api.post("/goals", {
        ...form,
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount),
        targetDate: form.targetDate || null,
        linkedAccountId: form.linkedAccountId || null,
      });

      setForm(initialForm);
      setMessage("Goal created successfully.");
      await loadData();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to create goal.");
      } else {
        setMessage("Failed to create goal.");
      }
    }
  }

  async function contribute(goalId: string, linkedAccountId: string | null) {
    const amount = Number(contributionAmounts[goalId] ?? "0");
    if (!amount) {
      return;
    }

    await api.post(`/goals/${goalId}/contribute`, {
      amount,
      accountId: linkedAccountId,
    });

    setContributionAmounts((current) => ({ ...current, [goalId]: "" }));
    await loadData();
  }

  async function withdraw(goalId: string, linkedAccountId: string | null) {
    const amount = Number(withdrawAmounts[goalId] ?? "0");
    if (!amount) {
      return;
    }

    await api.post(`/goals/${goalId}/withdraw`, {
      amount,
      accountId: linkedAccountId,
    });

    setWithdrawAmounts((current) => ({ ...current, [goalId]: "" }));
    await loadData();
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Goals"
        title="Track savings goals with visible progress"
        description="Goals are live now. Create a target, set a deadline, and contribute over time while watching your progress move toward completion."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onCreate}>
          <h3 className="text-xl font-semibold">New Savings Goal</h3>

          <input
            className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Emergency Fund"
            required
            value={form.name}
          />

          <input
            className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
            onChange={(event) => setForm((current) => ({ ...current, targetAmount: event.target.value }))}
            placeholder="Target amount"
            required
            type="number"
            value={form.targetAmount}
          />

          <input
            className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
            onChange={(event) => setForm((current) => ({ ...current, currentAmount: event.target.value }))}
            placeholder="Current amount"
            type="number"
            value={form.currentAmount}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              data-empty={form.icon === "" ? "true" : "false"}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              value={form.icon}
            >
              <option value="shield">Emergency</option>
              <option value="plane">Travel</option>
              <option value="home">Home</option>
              <option value="car">Vehicle</option>
              <option value="gift">Gift</option>
              <option value="star">Dream goal</option>
            </select>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              type="color"
              value={form.color}
            />
          </div>

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))}
            type="date"
            value={form.targetDate}
          />

          <select
            className="w-full rounded-2xl border border-border px-4 py-3"
            data-empty={form.linkedAccountId === "" ? "true" : "false"}
            onChange={(event) => setForm((current) => ({ ...current, linkedAccountId: event.target.value }))}
            value={form.linkedAccountId}
          >
            <option value="">Optional linked account</option>
            {editableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          {message ? <p className="text-sm text-ink/70">{message}</p> : null}

          <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" type="submit">
            Save Goal
          </button>
        </form>

        <section className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold">Goal Progress</h3>
          <div className="mt-5 space-y-4">
            {goals.length === 0 ? (
              <p className="text-sm text-ink/65">No goals yet. Create one to start tracking savings progress.</p>
            ) : (
              goals.map((goal) => (
                <article key={goal.id} className="surface-panel rounded-2xl border border-border/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          {goal.icon ?? "goal"}
                        </span>
                        <p className="font-semibold text-ink">{goal.name}</p>
                      </div>
                      <p className="mt-1 text-sm text-ink/55">
                        Rs {goal.currentAmount.toLocaleString("en-IN")} / Rs {goal.targetAmount.toLocaleString("en-IN")}
                      </p>
                      {goal.targetDate ? (
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-ink/45">Target {goal.targetDate}</p>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-primary">{goal.progressPercent}%</p>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-border">
                    <div className="h-3 rounded-full bg-success" style={{ width: `${Math.min(goal.progressPercent, 100)}%` }} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Add Money</p>
                      <p className="mt-1 text-sm text-ink/55">Move extra savings into this goal.</p>
                      <div className="mt-3 space-y-3">
                        <input
                          className="w-full rounded-2xl border border-border px-4 py-3"
                          onChange={(event) => setContributionAmounts((current) => ({ ...current, [goal.id]: event.target.value }))}
                          placeholder="Contribution amount"
                          type="number"
                          value={contributionAmounts[goal.id] ?? ""}
                        />
                        <button
                          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                          onClick={() => contribute(goal.id, goal.linkedAccountId)}
                          type="button"
                        >
                          Add Contribution
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Withdraw</p>
                      <p className="mt-1 text-sm text-ink/55">Pull money back out if you need to reallocate it.</p>
                      <div className="mt-3 space-y-3">
                        <input
                          className="w-full rounded-2xl border border-border px-4 py-3"
                          onChange={(event) => setWithdrawAmounts((current) => ({ ...current, [goal.id]: event.target.value }))}
                          placeholder="Withdraw amount"
                          type="number"
                          value={withdrawAmounts[goal.id] ?? ""}
                        />
                        <button
                          className="w-full rounded-2xl bg-danger px-4 py-3 text-sm font-semibold text-white"
                          onClick={() => withdraw(goal.id, goal.linkedAccountId)}
                          type="button"
                        >
                          Withdraw Funds
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
