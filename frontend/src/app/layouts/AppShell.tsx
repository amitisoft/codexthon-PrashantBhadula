import { FormEvent, useState } from "react";
import { Bell, ChevronRight, Search } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { appNavItems } from "@/app/navigation";
import { useAuthStore } from "@/store/authStore";

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [searchTerm, setSearchTerm] = useState("");

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSearch = searchTerm.trim();
    if (!normalizedSearch) {
      navigate("/transactions");
      return;
    }

    navigate(`/transactions?search=${encodeURIComponent(normalizedSearch)}`);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(169,203,200,0.28),_transparent_30%),linear-gradient(180deg,_#f7faf8_0%,_#edf3f1_100%)] text-ink">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <aside className="rounded-xl2 border border-border/80 bg-white/80 p-5 shadow-panel backdrop-blur">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold uppercase tracking-[0.28em] text-primary">
              FITRA
            </h1>
            <p className="mt-2 text-sm font-medium tracking-[0.06em] text-ink/45">Modern way to manage money</p>
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
                      "flex items-center justify-between rounded-2xl px-4 py-3 transition",
                      isActive ? "bg-primary text-white shadow-panel" : "text-ink/75 hover:bg-canvas",
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
                      <ChevronRight className={isActive ? "h-4 w-4 text-white/70" : "h-4 w-4 text-ink/35"} />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-border bg-canvas p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Signed in as</p>
            <p className="mt-2 font-semibold text-ink">{user?.displayName ?? "User"}</p>
            <p className="mt-1 text-sm text-ink/55">
              {user?.email} • {user?.currencyCode}/{user?.locale}
            </p>
            <button
              className="mt-4 rounded-2xl border border-border bg-white px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-primary hover:text-white"
              onClick={clearSession}
              type="button"
            >
              Log Out
            </button>
          </div>
        </aside>

        <main className="rounded-xl2 border border-white/60 bg-white/75 p-6 shadow-panel backdrop-blur">
          <div className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary/65">Workspace</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Financial control, without noise</h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <form className="flex items-center gap-2 rounded-2xl border border-border bg-canvas px-4 py-2 text-sm text-ink/55" onSubmit={onSearch}>
                <Search className="h-4 w-4" />
                <input
                  className="min-w-0 flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink/45"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search merchant or note"
                  value={searchTerm}
                />
                <button className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink/75 transition hover:bg-primary hover:text-white" type="submit">
                  Search
                </button>
              </form>
              <button
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-medium text-ink/70 transition hover:bg-canvas"
                type="button"
              >
                <Bell className="h-4 w-4" />
                Alerts
              </button>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
