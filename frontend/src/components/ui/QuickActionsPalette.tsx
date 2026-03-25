import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Goal, Keyboard, LayoutDashboard, PieChart, RefreshCcw, Search, Sparkles, WalletCards, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

type QuickActionsPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type QuickAction = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: typeof LayoutDashboard;
  action: () => void;
};

export function QuickActionsPalette({ open, onClose }: QuickActionsPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const actions = useMemo<QuickAction[]>(
    () => [
      {
        id: "dashboard",
        label: "Open Dashboard",
        description: "Jump back to your command center",
        keywords: "home overview dashboard",
        icon: LayoutDashboard,
        action: () => navigate("/"),
      },
      {
        id: "add-transaction",
        label: "Add Transaction",
        description: "Record income, expense, or transfer",
        keywords: "new transaction add expense income transfer",
        icon: ArrowRightLeft,
        action: () => navigate("/transactions"),
      },
      {
        id: "new-budget",
        label: "Create Budget",
        description: "Set a fresh monthly spending target",
        keywords: "budget monthly target",
        icon: PieChart,
        action: () => navigate("/budgets"),
      },
      {
        id: "new-goal",
        label: "Create Goal",
        description: "Start a new savings milestone",
        keywords: "goal savings target",
        icon: Goal,
        action: () => navigate("/goals"),
      },
      {
        id: "forecast",
        label: "Open Forecast",
        description: "See the planning view on the dashboard",
        keywords: "forecast planning cash flow",
        icon: WalletCards,
        action: () => navigate("/"),
      },
      {
        id: "rules",
        label: "Open Rules",
        description: "Manage your automations",
        keywords: "rules automation classify",
        icon: Sparkles,
        action: () => navigate("/rules"),
      },
      {
        id: "recurring",
        label: "Manage Recurring",
        description: "Edit subscriptions, salary, and reminders",
        keywords: "recurring bills salary subscriptions",
        icon: RefreshCcw,
        action: () => navigate("/recurring"),
      },
    ],
    [navigate],
  );

  const filteredActions = actions.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalizedQuery);
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/35 px-4 py-16 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className="modal-panel w-full max-w-2xl rounded-[1.6rem] p-4 md:p-5" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Quick actions">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Quick Actions</p>
            <p className="mt-1 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink/45">
              <Keyboard className="h-3.5 w-3.5" />
              Cmd/Ctrl + K
            </p>
          </div>
          <button className="premium-button premium-button-secondary rounded-full p-2.5" onClick={onClose} type="button" aria-label="Close quick actions">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="premium-card-soft mt-4 flex items-center gap-3 rounded-[1.2rem] px-4 py-3">
          <Search className="h-4 w-4 text-ink/45" />
          <input
            autoFocus
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages or actions"
            value={query}
          />
        </div>

        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {filteredActions.length === 0 ? (
            <div className="premium-empty rounded-[1.2rem] p-4">
              <p className="text-sm font-semibold text-ink">No matching action found.</p>
              <p className="mt-2 text-sm leading-6 text-ink/62">Try terms like transaction, goal, forecast, or rules.</p>
            </div>
          ) : (
            filteredActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className="premium-card-soft flex w-full items-center gap-4 rounded-[1.2rem] p-4 text-left transition hover:border-border/90 hover:bg-canvas"
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  type="button"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{item.label}</p>
                    <p className="mt-1 text-sm text-ink/58">{item.description}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
