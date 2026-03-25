import axios from "axios";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Eye, PencilLine, Share2, Shield, X } from "lucide-react";
import { PageIntro } from "@/components/ui/PageIntro";
import { useTimedMessage } from "@/hooks/useTimedMessage";
import { api } from "@/services/api";
import type { Account } from "@/types/api";

const initialForm = {
  name: "",
  type: "bank account",
  openingBalance: "0",
  institutionName: "",
};

const initialShareForm = {
  email: "",
  role: "viewer",
};

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(initialForm);
  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
  });
  const [shareForm, setShareForm] = useState(initialShareForm);
  const [activeShareAccountId, setActiveShareAccountId] = useState<string | null>(null);
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [message, setMessage] = useTimedMessage();

  const editableAccounts = useMemo(() => accounts.filter((account) => account.accessRole !== "viewer"), [accounts]);
  const activeShareAccount = accounts.find((account) => account.id === activeShareAccountId) ?? null;

  async function loadAccounts() {
    const { data } = await api.get<Account[]>("/accounts");
    setAccounts(data);
  }

  useEffect(() => {
    loadAccounts().catch(() => setMessage("Failed to load accounts."));
  }, []);

  useEffect(() => {
    const defaultFromAccount = editableAccounts[0]?.id ?? "";
    const defaultToAccount = editableAccounts.find((account) => account.id !== defaultFromAccount)?.id ?? "";

    setTransferForm((current) => ({
      ...current,
      fromAccountId: editableAccounts.some((account) => account.id === current.fromAccountId) ? current.fromAccountId : defaultFromAccount,
      toAccountId:
        editableAccounts.some((account) => account.id === current.toAccountId && account.id !== (current.fromAccountId || defaultFromAccount))
          ? current.toAccountId
          : defaultToAccount,
    }));
  }, [editableAccounts]);

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

  async function onShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeShareAccount) {
      return;
    }

    setMessage(null);
    setIsSavingShare(true);

    try {
      const { data } = await api.post<Account>(`/accounts/${activeShareAccount.id}/share`, shareForm);
      setAccounts((current) => current.map((account) => (account.id === data.id ? data : account)));
      setShareForm(initialShareForm);
      setMessage("Account sharing updated successfully.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to share account.");
      } else {
        setMessage("Failed to share account.");
      }
    } finally {
      setIsSavingShare(false);
    }
  }

  async function removeMember(accountId: string, memberUserId: string) {
    setMessage(null);
    setRemovingMemberId(memberUserId);

    try {
      const { data } = await api.delete<Account>(`/accounts/${accountId}/members/${memberUserId}`);
      setAccounts((current) => current.map((account) => (account.id === data.id ? data : account)));
      setMessage("Member removed from the account.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to remove member.");
      } else {
        setMessage("Failed to remove member.");
      }
    } finally {
      setRemovingMemberId(null);
    }
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Accounts"
        title="Keep accounts private by default, then share only the ones that matter"
        description="Shared Accounts are live with an account-first model. Invite a collaborator as a viewer or editor without exposing the rest of your finances."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">New Account</h3>
                <p className="mt-1 text-sm text-ink/60">Create a private account first. You can share it later with the right access level.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Private by default</span>
            </div>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Fitra Bank Account"
              required
              value={form.name}
            />

            <select
              className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
              data-empty={form.type === "" ? "true" : "false"}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              value={form.type}
            >
              <option value="bank account">Bank Account</option>
              <option value="cash wallet">Cash Wallet</option>
              <option value="credit card">Credit Card</option>
              <option value="savings account">Savings Account</option>
            </select>

            <input
              className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
              onChange={(event) => setForm((current) => ({ ...current, openingBalance: event.target.value }))}
              placeholder="Opening balance"
              required
              type="number"
              value={form.openingBalance}
            />

            <input
              className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Transfer Between Editable Accounts</h3>
                <p className="mt-1 text-sm text-ink/60">Only owner and editor accounts appear here, so the move-money flow stays safe.</p>
              </div>
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-success">Secure access</span>
            </div>

            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              data-empty={transferForm.fromAccountId === "" ? "true" : "false"}
              onChange={(event) =>
                setTransferForm((current) => ({
                  ...current,
                  fromAccountId: event.target.value,
                  toAccountId:
                    current.toAccountId === event.target.value
                      ? editableAccounts.find((account) => account.id !== event.target.value)?.id ?? ""
                      : current.toAccountId,
                }))
              }
              required
              value={transferForm.fromAccountId}
            >
              <option value="">From account</option>
              {editableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-2xl border border-border px-4 py-3"
              data-empty={transferForm.toAccountId === "" ? "true" : "false"}
              onChange={(event) => setTransferForm((current) => ({ ...current, toAccountId: event.target.value }))}
              required
              value={transferForm.toAccountId}
            >
              <option value="">To account</option>
              {editableAccounts
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

            <button className="rounded-2xl bg-primary-soft px-5 py-3 text-sm font-semibold text-white" type="submit">
              Move Money
            </button>
          </form>
        </div>

        <section className="rounded-xl2 border border-border bg-canvas p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Visible Accounts</h3>
              <p className="mt-1 text-sm text-ink/60">Your own accounts and any accounts another user shared with you.</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-canvas/60 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Visible balance</p>
              <p className="mt-1 text-xl font-semibold text-primary">
                Rs {accounts.reduce((sum, account) => sum + account.currentBalance, 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-ink/65">No accounts yet. Create your first account to unlock transactions and forecasting.</p>
            ) : (
              accounts.map((account) => (
                <article key={account.id} className="surface-panel rounded-2xl border border-border/80 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-ink">{account.name}</p>
                        <Badge tone={account.isShared ? "primary" : "muted"}>{account.isShared ? "Shared" : "Private"}</Badge>
                        <Badge tone={account.accessRole === "owner" ? "success" : account.accessRole === "editor" ? "primary" : "muted"}>
                          {account.accessRole}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink/55">
                        {account.type} {account.institutionName ? `• ${account.institutionName}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {account.members.map((member) => (
                          <span
                            key={member.userId}
                            className="rounded-full border border-border/70 bg-canvas/70 px-3 py-1 text-xs font-medium text-ink/75"
                          >
                            {member.displayName} • {member.role}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-3 xl:items-end">
                      <div className="text-left xl:text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Current Balance</p>
                        <p className="mt-1 text-2xl font-semibold text-primary">
                          Rs {account.currentBalance.toLocaleString("en-IN")}
                        </p>
                      </div>
                      {account.isOwner ? (
                        <button
                          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-canvas px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-primary/30 hover:text-primary"
                          onClick={() => {
                            setActiveShareAccountId(account.id);
                            setShareForm(initialShareForm);
                          }}
                          type="button"
                        >
                          <Share2 className="h-4 w-4" />
                          Manage Sharing
                        </button>
                      ) : (
                        <p className="rounded-2xl border border-border/80 bg-canvas/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-ink/55">
                          Collaborator access
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {activeShareAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm">
          <div className="modal-panel w-full max-w-2xl rounded-[28px] border p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Shared Account</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">{activeShareAccount.name}</h3>
                <p className="mt-2 text-sm text-ink/60">
                  Share this account with a trusted person while keeping the rest of your finances private.
                </p>
              </div>
              <button
                aria-label="Close sharing modal"
                className="rounded-full border border-border p-2 text-ink/70 transition hover:text-ink"
                onClick={() => setActiveShareAccountId(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <form className="space-y-4 rounded-2xl border border-border/80 bg-canvas/70 p-5" onSubmit={onShare}>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-ink">Invite a collaborator</p>
                </div>
                <p className="text-sm text-ink/60">Use an existing Fitra account email. Choose view-only or editing access.</p>

                <input
                  className="w-full rounded-2xl border border-border px-4 py-3 placeholder:text-ink/25 dark:placeholder:text-ink/30"
                  onChange={(event) => setShareForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="teammate@example.com"
                  required
                  type="email"
                  value={shareForm.email}
                />

                <select
                  className="w-full rounded-2xl border border-border px-4 py-3"
                  data-empty={shareForm.role === "" ? "true" : "false"}
                  onChange={(event) => setShareForm((current) => ({ ...current, role: event.target.value }))}
                  value={shareForm.role}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>

                <div className="rounded-2xl border border-border/70 bg-canvas/60 p-4 text-sm text-ink/65">
                  <p className="font-medium text-ink">Access guide</p>
                  <p className="mt-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-ink/60" />
                    Viewer can see balances and transactions but cannot edit them.
                  </p>
                  <p className="mt-2 flex items-center gap-2">
                    <PencilLine className="h-4 w-4 text-primary" />
                    Editor can add transactions, transfer money, and use the account in forecasting.
                  </p>
                </div>

                <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" disabled={isSavingShare} type="submit">
                  {isSavingShare ? "Saving..." : "Save Sharing"}
                </button>
              </form>

              <section className="rounded-2xl border border-border/80 bg-canvas/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">People with access</p>
                    <p className="mt-1 text-sm text-ink/60">Owner stays in control. Members can be updated or removed any time.</p>
                  </div>
                  <Badge tone="primary">{activeShareAccount.members.length} people</Badge>
                </div>

                <div className="mt-4 max-h-[340px] space-y-3 overflow-y-auto pr-1">
                  {activeShareAccount.members.map((member) => (
                    <article key={member.userId} className="rounded-2xl border border-border/70 bg-canvas/60 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{member.displayName}</p>
                          <p className="mt-1 truncate text-sm text-ink/55">{member.email}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge tone={member.isOwner ? "success" : member.role === "editor" ? "primary" : "muted"}>
                              {member.role}
                            </Badge>
                            <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-ink/55">
                              Added {new Date(member.addedAtUtc).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {!member.isOwner ? (
                          <button
                            className="rounded-2xl bg-danger px-3 py-2 text-xs font-semibold text-white"
                            disabled={removingMemberId === member.userId}
                            onClick={() => removeMember(activeShareAccount.id, member.userId)}
                            type="button"
                          >
                            {removingMemberId === member.userId ? "Removing..." : "Remove"}
                          </button>
                        ) : (
                          <span className="rounded-2xl border border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                            Owner
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "primary" | "success" | "muted" }) {
  const toneClass =
    tone === "primary" ? "bg-primary/10 text-primary" : tone === "success" ? "bg-success/10 text-success" : "bg-ink/8 text-ink/65";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>{children}</span>;
}
