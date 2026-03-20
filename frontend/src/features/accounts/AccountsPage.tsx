import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { PageIntro } from "@/components/ui/PageIntro";
import { api } from "@/services/api";
import type { Account } from "@/types/api";

const initialForm = {
  name: "",
  type: "bank account",
  openingBalance: "0",
  institutionName: "",
};

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(initialForm);
  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  async function loadAccounts() {
    const { data } = await api.get<Account[]>("/accounts");
    setAccounts(data);
  }

  useEffect(() => {
    loadAccounts().catch(() => setMessage("Failed to load accounts."));
  }, []);

  useEffect(() => {
    setTransferForm((current) => ({
      ...current,
      fromAccountId: current.fromAccountId || accounts[0]?.id || "",
      toAccountId:
        current.toAccountId ||
        accounts.find((account) => account.id !== (current.fromAccountId || accounts[0]?.id))?.id ||
        "",
    }));
  }, [accounts]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      await api.post("/accounts", {
        ...form,
        openingBalance: Number(form.openingBalance),
      });

      setForm(initialForm);
      setMessage("Account created successfully.");
      await loadAccounts();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to create account.");
      } else {
        setMessage("Failed to create account.");
      }
    }
  }

  async function onTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      await api.post("/accounts/transfer", {
        ...transferForm,
        amount: Number(transferForm.amount),
      });

      setTransferForm((current) => ({ ...current, amount: "" }));
      setMessage("Account transfer completed successfully.");
      await loadAccounts();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to complete transfer.");
      } else {
        setMessage("Failed to complete transfer.");
      }
    }
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Accounts"
        title="Connect the money sources you use"
        description="Accounts are live now. Create your bank, wallet, or credit card accounts here and they will become selectable during transaction entry."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onSubmit}>
            <h3 className="text-xl font-semibold">New Account</h3>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="HDFC Salary Account"
              required
              value={form.name}
            />

            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              value={form.type}
            >
              <option value="bank account">Bank Account</option>
              <option value="cash wallet">Cash Wallet</option>
              <option value="credit card">Credit Card</option>
              <option value="savings account">Savings Account</option>
            </select>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, openingBalance: event.target.value }))}
              placeholder="Opening balance"
              required
              type="number"
              value={form.openingBalance}
            />

            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setForm((current) => ({ ...current, institutionName: event.target.value }))}
              placeholder="Institution name"
              value={form.institutionName}
            />

            {message ? <p className="text-sm text-ink/70">{message}</p> : null}

            <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" type="submit">
              Save Account
            </button>
          </form>

          <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onTransfer}>
            <h3 className="text-xl font-semibold">Transfer Between Accounts</h3>

            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) =>
                setTransferForm((current) => ({
                  ...current,
                  fromAccountId: event.target.value,
                  toAccountId:
                    current.toAccountId === event.target.value
                      ? accounts.find((account) => account.id !== event.target.value)?.id ?? ""
                      : current.toAccountId,
                }))
              }
              required
              value={transferForm.fromAccountId}
            >
              <option value="">From account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              onChange={(event) => setTransferForm((current) => ({ ...current, toAccountId: event.target.value }))}
              required
              value={transferForm.toAccountId}
            >
              <option value="">To account</option>
              {accounts
                .filter((account) => account.id !== transferForm.fromAccountId)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </select>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3"
              min="0.01"
              onChange={(event) => setTransferForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="Transfer amount"
              required
              step="0.01"
              type="number"
              value={transferForm.amount}
            />

            <button className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white" type="submit">
              Move Money
            </button>
          </form>
        </div>

        <section className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold">Your Accounts</h3>
          <div className="mt-5 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-ink/65">No accounts yet. Create your first account to unlock transactions.</p>
            ) : (
              accounts.map((account) => (
                <article key={account.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{account.name}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        {account.type} {account.institutionName ? `• ${account.institutionName}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Current Balance</p>
                      <p className="mt-1 text-xl font-semibold text-primary">
                        Rs {account.currentBalance.toLocaleString("en-IN")}
                      </p>
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
