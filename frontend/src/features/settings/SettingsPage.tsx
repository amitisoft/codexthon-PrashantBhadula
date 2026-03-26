import { useEffect, useMemo, useState } from "react";
import { PageIntro } from "@/components/ui/PageIntro";
import { useTimedMessage } from "@/hooks/useTimedMessage";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { UserSettings } from "@/types/api";

const currencyOptions = [
  { code: "INR", label: "Indian Rupee" },
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "AED", label: "UAE Dirham" },
  { code: "SGD", label: "Singapore Dollar" },
];

const localeOptions = [
  { value: "en-IN", label: "English (India)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
];

const timeZoneOptions = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
];

const defaultSettings: UserSettings = {
  currencyCode: "INR",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
};

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [message, setMessage] = useTimedMessage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    api
      .get<UserSettings>("/settings")
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setSettings(response.data);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setMessage("Could not load preferences right now.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [setMessage]);

  const selectedCurrencyLabel = useMemo(
    () => currencyOptions.find((option) => option.code === settings.currencyCode)?.label ?? settings.currencyCode,
    [settings.currencyCode],
  );

  async function saveSettings() {
    setMessage(null);
    setIsSaving(true);

    try {
      const { data } = await api.put<UserSettings>("/settings", settings);
      setSettings(data);

      if (user) {
        updateUser({
          ...user,
          currencyCode: data.currencyCode,
          locale: data.locale,
        });
      }

      setMessage("Preferences updated successfully.");
    } catch {
      setMessage("Could not save preferences right now.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetToDefaults() {
    setSettings(defaultSettings);
    setMessage("Defaults loaded. Save to apply them.");
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Settings"
        title="Make Fitra feel like your workspace"
        description="Control your default currency, locale, and time zone so every amount, date, and dashboard surface matches how you actually manage money."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="premium-card rounded-xl2 p-6 md:p-7">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-primary/70">Preferences</p>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Regional defaults</h3>
            <p className="text-sm leading-6 text-ink/62">
              These defaults shape how balances, reports, and data entry feel throughout the app.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-ink/78">
              Default currency
              <select
                className="mt-2 w-full rounded-2xl border border-border bg-canvas px-4 py-3 text-ink outline-none"
                onChange={(event) => setSettings((current) => ({ ...current, currencyCode: event.target.value }))}
                value={settings.currencyCode}
              >
                {currencyOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} · {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink/78">
              Locale
              <select
                className="mt-2 w-full rounded-2xl border border-border bg-canvas px-4 py-3 text-ink outline-none"
                onChange={(event) => setSettings((current) => ({ ...current, locale: event.target.value }))}
                value={settings.locale}
              >
                {localeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink/78 md:col-span-2">
              Time zone
              <select
                className="mt-2 w-full rounded-2xl border border-border bg-canvas px-4 py-3 text-ink outline-none"
                onChange={(event) => setSettings((current) => ({ ...current, timeZone: event.target.value }))}
                value={settings.timeZone}
              >
                {timeZoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {message ? <p className="mt-5 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink/72">{message}</p> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="premium-button premium-button-primary w-full sm:w-auto"
              disabled={isLoading || isSaving}
              onClick={saveSettings}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
            <button
              className="premium-button premium-button-secondary w-full sm:w-auto"
              disabled={isSaving}
              onClick={resetToDefaults}
              type="button"
            >
              Review Defaults
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="premium-card rounded-xl2 p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Current profile</p>
            <h3 className="mt-3 text-xl font-semibold text-ink">{user?.displayName ?? "User"}</h3>
            <p className="mt-1 text-sm text-ink/58">{user?.email ?? "Signed-in account"}</p>

            <div className="mt-5 grid gap-3">
              <div className="premium-card-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-ink/48">Currency</p>
                <p className="mt-2 text-lg font-semibold text-ink">{settings.currencyCode}</p>
                <p className="mt-1 text-sm text-ink/58">{selectedCurrencyLabel}</p>
              </div>

              <div className="premium-card-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-ink/48">Locale</p>
                <p className="mt-2 text-lg font-semibold text-ink">{settings.locale}</p>
                <p className="mt-1 text-sm text-ink/58">Controls date and number formatting across the app.</p>
              </div>

              <div className="premium-card-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-ink/48">Time zone</p>
                <p className="mt-2 text-lg font-semibold text-ink">{settings.timeZone}</p>
                <p className="mt-1 text-sm text-ink/58">Used for reminders, recurring events, and timeline displays.</p>
              </div>
            </div>
          </section>

          <section className="premium-empty rounded-xl2 p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Helpful note</p>
            <p className="mt-3 text-sm leading-7 text-ink/68">
              If you change currency or locale here, the sidebar profile and future formatting will follow your updated preferences after saving.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
