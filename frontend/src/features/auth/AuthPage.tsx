import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { FitraLogo } from "@/components/branding/FitraLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTimedMessage } from "@/hooks/useTimedMessage";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { AuthResponse } from "@/types/api";

type AuthMode = "login" | "register" | "forgot" | "reset";

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Unable to reach Fitra right now. Please try again.";
  }

  if (!error.response) {
    return "Could not contact the backend API. Please confirm the backend is running on http://localhost:8080.";
  }

  const payload = error.response.data as
    | { message?: string; title?: string; detail?: string }
    | string
    | undefined;

  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    return payload.message ?? payload.title ?? payload.detail ?? `Request failed with status ${error.response.status}.`;
  }

  return `Request failed with status ${error.response.status}.`;
}

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
  const [feedback, setFeedback] = useTimedMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page-bg flex min-h-screen items-center justify-center px-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="auth-hero-bg rounded-xl2 border border-border p-8 text-white shadow-panel">
          <FitraLogo
            className="items-start text-left"
            onDark
            subtitle="Modern way to manage money."
            subtitleClassName="tracking-[0.08em]"
            textClassName="tracking-[0.3em]"
          />
          <p className="mt-4 text-sm leading-7 text-white/80">
            Fitra helps you organize accounts, record income and expenses, understand spending, and build better money habits with a calm, modern experience.
          </p>
          <div className="mt-8 space-y-3 text-sm text-white/78">
            <p>Create accounts for bank, wallet, or card balances.</p>
            <p>Track expenses and income against real categories.</p>
            <p>Build toward budgets, goals, reports, and recurring payments.</p>
          </div>
        </section>

        <section className="surface-panel rounded-xl2 border border-border p-8 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-primary/60">Welcome to</p>
              <div className="mt-3">
                <FitraLogo compact />
              </div>
            </div>
            <ThemeToggle />
          </div>
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
                <div className="relative mt-2">
                  <input
                    className="w-full rounded-2xl border border-border px-4 py-3 pr-12"
                    minLength={8}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/50 transition hover:text-ink"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
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
