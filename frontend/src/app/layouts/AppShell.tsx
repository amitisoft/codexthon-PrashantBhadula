import { FormEvent, useEffect, useState } from "react";
import { Bell, ChevronRight, Command, Plus, Search } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { appNavItems } from "@/app/navigation";
import { FitraLogo } from "@/components/branding/FitraLogo";
import { QuickActionsPalette } from "@/components/ui/QuickActionsPalette";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { NotificationItem } from "@/types/api";

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    api.get<NotificationItem[]>("/notifications").then((response) => setNotifications(response.data)).catch(() => setNotifications([]));
  }, [notificationsOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickActionsOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSearch = searchTerm.trim();
    if (!normalizedSearch) {
      return;
    }

    navigate(`/transactions?search=${encodeURIComponent(normalizedSearch)}`);
  }

  return (
    <div className="app-page-bg min-h-screen text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[288px_1fr] lg:px-6 lg:py-6">
        <aside className="surface-panel premium-border rounded-[1.75rem] p-5 shadow-panel backdrop-blur lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
          <div className="mb-8">
            <FitraLogo className="items-start text-left" compact subtitle="Modern way to manage money" />
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Manage accounts, transactions, budgets, goals, and recurring payments with calm financial clarity.
            </p>
          </div>

          <nav className="space-y-2">
            {appNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "group flex items-center justify-between rounded-[1.25rem] px-4 py-3.5 transition",
                      isActive ? "bg-primary text-white shadow-panel" : "premium-card-soft text-ink/82 hover:border-border/90 hover:bg-canvas hover:text-ink",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className={isActive ? "h-5 w-5 text-white" : "h-5 w-5 text-primary"} />
                        <div>
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className={isActive ? "text-xs text-white/75" : "text-xs text-ink/45"}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={isActive ? "h-4 w-4 text-white/70" : "h-4 w-4 text-ink/30 transition group-hover:translate-x-0.5"} />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="premium-card mt-8 rounded-[1.35rem] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Signed in as</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-ink">{user?.displayName ?? "User"}</p>
            <p className="mt-1 text-sm text-ink/55">
              {user?.email} • {user?.currencyCode}/{user?.locale}
            </p>
            <button
              className="premium-button premium-button-secondary mt-4 w-full text-sm"
              onClick={clearSession}
              type="button"
            >
              Log Out
            </button>
          </div>
        </aside>

        <main className="surface-panel premium-border rounded-[1.9rem] p-4 shadow-panel backdrop-blur md:p-6">
          <div className="premium-card mb-7 rounded-[1.7rem] px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary/65">Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink md:text-[2rem]">Financial control, without noise</h2>
                <p className="mt-2 text-sm text-ink/58">A calmer finance workspace with smarter planning, automation, and visibility.</p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <form className="premium-card-soft flex min-w-0 items-center gap-2 rounded-[1.15rem] px-4 py-2.5 text-sm text-ink/55 lg:min-w-[320px]" onSubmit={onSearch}>
                  <Search className="h-4 w-4 shrink-0" />
                  <input
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink/25 dark:placeholder:text-ink/30"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search merchant or note"
                    value={searchTerm}
                  />
                  <button className="premium-button premium-button-secondary rounded-xl px-3 py-1.5 text-xs" type="submit">
                    Search
                  </button>
                </form>

                <div className="flex items-center gap-3">
                  <button
                    className="premium-button premium-button-secondary hidden rounded-[1rem] px-4 py-3 text-sm xl:inline-flex"
                    onClick={() => setQuickActionsOpen(true)}
                    type="button"
                  >
                    <Command className="h-4 w-4" />
                    Quick Actions
                  </button>
                  <div className="group relative">
                    <button
                      aria-label="Add transaction"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-panel transition hover:scale-[1.03] hover:opacity-90"
                      onClick={() => navigate("/transactions")}
                      type="button"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-panel transition duration-150 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-950">
                      Add Transaction
                    </div>
                  </div>
                  <ThemeToggle />
                  <div className="relative">
                    <button
                      className="premium-button premium-button-secondary rounded-[1rem] px-4 py-3 text-sm"
                      onClick={() => setNotificationsOpen((current) => !current)}
                      type="button"
                    >
                      <Bell className="h-4 w-4" />
                      Alerts
                    </button>
                    {notificationsOpen ? (
                      <div className="premium-card absolute right-0 z-20 mt-3 w-[360px] rounded-[1.4rem] p-4 shadow-panel">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">Notifications</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink/45">Signals that need your attention</p>
                          </div>
                          <button className="text-xs font-semibold text-primary" onClick={() => setNotificationsOpen(false)} type="button">
                            Close
                          </button>
                        </div>
                        <div className="mt-4 max-h-[380px] space-y-3 overflow-y-auto pr-1">
                          {notifications.length === 0 ? (
                            <div className="premium-empty rounded-[1.2rem] p-4">
                              <p className="text-sm text-ink/60">No alerts right now.</p>
                            </div>
                          ) : (
                            notifications.map((item) => (
                              <article key={item.id} className="premium-card-soft rounded-[1.1rem] p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">{item.type}</p>
                                <p className="mt-2 font-semibold text-ink">{item.title}</p>
                                <p className="mt-1 text-sm leading-6 text-ink/65">{item.body}</p>
                              </article>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
      <QuickActionsPalette onClose={() => setQuickActionsOpen(false)} open={quickActionsOpen} />
    </div>
  );
}
