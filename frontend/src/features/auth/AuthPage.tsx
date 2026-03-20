import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { AuthResponse } from "@/types/api";

type AuthMode = "login" | "register" | "forgot" | "reset";

function getModeFromPath(pathname: string): AuthMode {
  if (pathname.includes("reset-password")) {
    return "reset";
  }

  return "login";
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const [mode, setMode] = useState<AuthMode>(getModeFromPath(location.pathname));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  useEffect(() => {
    setMode(getModeFromPath(location.pathname));
  }, [location.pathname]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
        setSession(data);
        navigate("/");
      }

      if (mode === "register") {
        const { data } = await api.post<AuthResponse>("/auth/register", { email, password, displayName });
        setSession(data);
        navigate("/onboarding");
      }

      if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email });
        setFeedback("If the email exists, a reset link has been sent.");
      }

      if (mode === "reset") {
        const token = new URLSearchParams(location.search).get("token");
        await api.post("/auth/reset-password", { token, newPassword: password });
        setFeedback("Password reset complete. You can log in now.");
        setMode("login");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFeedback(error.response?.data?.message ?? "Unable to reach Fitra right now. Please try again.");
      } else {
        setFeedback("Unable to reach Fitra right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6fbfa_0%,_#e8f0ef_100%)] px-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-xl2 border border-border bg-[linear-gradient(180deg,_rgba(36,75,102,0.92),_rgba(38,87,93,0.92))] p-8 text-white shadow-panel">
          <h1 className="text-5xl font-semibold uppercase tracking-[0.3em] text-white">FITRA</h1>
          <p className="mt-3 text-sm font-medium tracking-[0.08em] text-white/68">Modern way to manage money.</p>
          <p className="mt-4 text-sm leading-7 text-white/80">
            Fitra helps you organize accounts, record income and expenses, understand spending, and build better money habits with a calm, modern experience.
          </p>
          <div className="mt-8 space-y-3 text-sm text-white/78">
            <p>Create accounts for bank, wallet, or card balances.</p>
            <p>Track expenses and income against real categories.</p>
            <p>Build toward budgets, goals, reports, and recurring payments.</p>
          </div>
        </section>

        <section className="rounded-xl2 border border-border bg-white p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.25em] text-primary/60">Welcome to Fitra</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink">
            {mode === "register"
              ? "Create your account"
              : mode === "forgot"
                ? "Recover your access"
                : mode === "reset"
                  ? "Choose a new password"
                  : "Sign in to continue"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            {mode === "register"
              ? "Start with your profile so you can add accounts, transactions, budgets, and goals."
              : mode === "forgot"
                ? "Enter your email and Fitra will prepare a secure reset flow for your account."
                : mode === "reset"
                  ? "Set a strong new password to protect your financial data."
                  : "Access your financial workspace to manage accounts, transactions, and insights."}
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "login", label: "Log In" },
              { value: "register", label: "Sign Up" },
              { value: "forgot", label: "Forgot Password" },
            ].map((item) => (
              <button
                key={item.value}
                className={[
                  "rounded-2xl px-4 py-2 text-sm font-medium transition",
                  mode === item.value ? "bg-primary text-white" : "bg-canvas text-ink/70",
                ].join(" ")}
                onClick={() => setMode(item.value as AuthMode)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {mode === "register" ? (
              <label className="block text-sm text-ink/75">
                Display Name
                <input
                  className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  value={displayName}
                />
              </label>
            ) : null}

            {mode !== "reset" ? (
              <label className="block text-sm text-ink/75">
                Email
                <input
                  className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
            ) : null}

            {mode !== "forgot" ? (
              <label className="block text-sm text-ink/75">
                {mode === "reset" ? "New Password" : "Password"}
                <input
                  className="mt-2 w-full rounded-2xl border border-border px-4 py-3"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            ) : null}

            {feedback ? <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink/70">{feedback}</p> : null}

            <button
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-soft disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Please wait..." : mode === "register" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : mode === "reset" ? "Reset Password" : "Log In"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
