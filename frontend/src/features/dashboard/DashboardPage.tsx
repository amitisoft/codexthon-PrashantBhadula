import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeHelp,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Flame,
  HeartPulse,
  Landmark,
  Lightbulb,
  PartyPopper,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { PageIntro } from "@/components/ui/PageIntro";
import { useTimedMessage } from "@/hooks/useTimedMessage";
import { api } from "@/services/api";
import { useDashboardPreferencesStore, type OverviewWidgetId, type PlanningWidgetId } from "@/store/dashboardPreferencesStore";
import type { DashboardSummary, ForecastSummary, HealthScoreSummary, NotificationItem } from "@/types/api";

const chartColors = ["#244B66", "#4C8A87", "#CC9C4B", "#C4665E", "#6D7E91", "#5C7A62"];
const overviewWidgetOptions: Array<{ id: OverviewWidgetId; label: string }> = [
  { id: "health", label: "Health Score" },
  { id: "metrics", label: "Key Metrics" },
  { id: "category", label: "Category Mix" },
  { id: "attention", label: "Attention Panel" },
  { id: "recent", label: "Recent Activity" },
  { id: "streaks", label: "Streaks" },
  { id: "review", label: "Month Review" },
  { id: "activity", label: "Shared Timeline" },
];
const planningWidgetOptions: Array<{ id: PlanningWidgetId; label: string }> = [
  { id: "forecast", label: "Forecast" },
  { id: "planning-metrics", label: "Planning Metrics" },
  { id: "budget", label: "Budgets" },
  { id: "upcoming", label: "Upcoming Bills" },
  { id: "goals", label: "Goals" },
  { id: "explainability", label: "Explainability" },
  { id: "calendar", label: "Calendar View" },
  { id: "simulation", label: "Scenario Simulation" },
];

type DashboardView = "overview" | "planning";

type HeroSignal = {
  label: string;
  value: string;
  note: string;
};

type InsightCard = {
  title: string;
  body: string;
  tone: string;
  icon: typeof Sparkles;
};

type DeltaBadge = {
  text: string;
  tone: string;
};

type StreakCard = {
  title: string;
  value: string;
  detail: string;
  icon: typeof Flame;
  tone: string;
};

type CelebrationState = {
  title: string;
  body: string;
  tone: string;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showCelebration, setShowCelebration] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [simulation, setSimulation] = useState({
    categoryName: "",
    diningReductionPercent: 15,
    extraIncome: 0,
    newMonthlySip: 5000,
  });
  const [summaryMessage, setSummaryMessage] = useTimedMessage();
  const [forecastMessage, setForecastMessage] = useTimedMessage();
  const [healthScoreMessage, setHealthScoreMessage] = useTimedMessage();
  const overviewWidgets = useDashboardPreferencesStore((state) => state.overviewWidgets);
  const planningWidgets = useDashboardPreferencesStore((state) => state.planningWidgets);
  const toggleOverviewWidget = useDashboardPreferencesStore((state) => state.toggleOverviewWidget);
  const togglePlanningWidget = useDashboardPreferencesStore((state) => state.togglePlanningWidget);
  const resetDashboardPreferences = useDashboardPreferencesStore((state) => state.reset);

  useEffect(() => {
    api
      .get<DashboardSummary>("/dashboard/summary")
      .then((response) => {
        setSummary(response.data);
        setSummaryMessage(null);
      })
      .catch(() => setSummaryMessage("Core dashboard metrics are not available right now."));

    api
      .get<ForecastSummary>("/forecast/month")
      .then((response) => {
        setForecast(response.data);
        setForecastMessage(null);
      })
      .catch(() => setForecastMessage("Cash flow forecast is not available right now."));

    api
      .get<HealthScoreSummary>("/insights/health-score")
      .then((response) => {
        setHealthScore(response.data);
        setHealthScoreMessage(null);
      })
      .catch(() => setHealthScoreMessage("Financial health score is not available right now."));

    api.get<NotificationItem[]>("/notifications").then((response) => setNotifications(response.data)).catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    if (!forecast?.patternCategories.length) {
      return;
    }

    setSimulation((current) => ({
      ...current,
      categoryName: current.categoryName || forecast.patternCategories[0].categoryName,
    }));
  }, [forecast]);

  const lastTrend = summary?.trend.at(-1) ?? null;
  const previousTrend = summary?.trend.at(-2) ?? null;
  const currentNetFlow = lastTrend ? lastTrend.income - lastTrend.expense : summary ? summary.metrics.currentMonthIncome - summary.metrics.currentMonthExpense : 0;
  const previousNetFlow = previousTrend ? previousTrend.income - previousTrend.expense : 0;
  const topCategory = summary?.categorySpend[0] ?? null;
  const completedGoalsCount = summary?.goals.filter((goal) => goal.status === "completed").length ?? 0;
  const activityTimeline = notifications.filter((item) => item.type === "activity").slice(0, 4);

  const heroSignals = useMemo<HeroSignal[]>(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        label: "Net balance",
        value: formatCurrency(summary.metrics.netBalance),
        note: `${summary.metrics.accountCount} visible accounts`,
      },
      {
        label: "Month cash flow",
        value: `${currentNetFlow >= 0 ? "+" : "-"}${formatCurrency(Math.abs(currentNetFlow))}`,
        note: `${summary.metrics.transactionCount} transactions captured`,
      },
      {
        label: "Active plans",
        value: `${summary.metrics.activeBudgetCount + summary.metrics.activeGoalCount}`,
        note: `${summary.metrics.activeBudgetCount} budgets • ${summary.metrics.activeGoalCount} goals`,
      },
    ];
  }, [summary, currentNetFlow]);

  const dailyInsights = useMemo<InsightCard[]>(() => {
    const cards: InsightCard[] = [];

    if (summary && previousTrend) {
      const expenseDelta = summary.metrics.currentMonthExpense - previousTrend.expense;
      cards.push({
        title: expenseDelta <= 0 ? "Expense pressure is easing" : "Expense pressure is rising",
        body: `${expenseDelta <= 0 ? "You are spending" : "You are spending"} ${Math.abs(roundToWhole(expenseDelta)).toLocaleString("en-IN")} ${expenseDelta <= 0 ? "less" : "more"} than last month so far.`,
        tone: expenseDelta <= 0 ? "text-success" : "text-danger",
        icon: expenseDelta <= 0 ? TrendingDown : TrendingUp,
      });
    }

    if (forecast) {
      cards.push({
        title: forecast.warnings.length === 0 ? "Forecast looks stable" : "Forecast needs attention",
        body: forecast.warnings[0]?.message ?? `You still have ${formatCurrency(forecast.overview.safeToSpend)} safely available this month.`,
        tone: forecast.warnings.length === 0 ? "text-success" : "text-warning",
        icon: forecast.warnings.length === 0 ? ShieldCheck : AlertTriangle,
      });
    }

    if (healthScore?.isAvailable) {
      const weakestFactor = [...healthScore.factors].sort((left, right) => left.score - right.score)[0];
      cards.push({
        title: "Health score driver",
        body: weakestFactor ? `${weakestFactor.label} is the biggest lever right now: ${weakestFactor.insight}` : healthScore.summary,
        tone: "text-primary",
        icon: HeartPulse,
      });
    }

    if (cards.length === 0) {
      cards.push({
        title: "Start unlocking smart guidance",
        body: "Add a few transactions and one budget to turn on forecast, score explanations, and monthly review highlights.",
        tone: "text-primary",
        icon: Sparkles,
      });
    }

    return cards.slice(0, 3);
  }, [summary, previousTrend, forecast, healthScore]);

  const celebration = useMemo<CelebrationState | null>(() => {
    if (completedGoalsCount > 0) {
      return {
        title: "A savings milestone is complete",
        body: `${completedGoalsCount} goal${completedGoalsCount > 1 ? "s have" : " has"} reached the target amount. This is a great moment to set the next stretch goal.`,
        tone: "success",
      };
    }

    if (forecast && forecast.warnings.length === 0 && forecast.overview.safeToSpend > 0) {
      return {
        title: "This month is tracking with breathing room",
        body: `${formatCurrency(forecast.overview.safeToSpend)} is still safe to spend after keeping your protective buffer intact.`,
        tone: "accent",
      };
    }

    return null;
  }, [completedGoalsCount, forecast, healthScore]);

  const healthFactorAverage = healthScore?.factors.length
    ? Math.round(healthScore.factors.reduce((total, factor) => total + factor.score, 0) / healthScore.factors.length)
    : 0;

  const overviewMetrics = summary
    ? [
        {
          label: "Net Balance",
          value: formatCurrency(summary.metrics.netBalance),
          detail: `${summary.metrics.accountCount} accounts connected`,
          icon: Landmark,
          tone: "text-primary",
          delta: getNetFlowDelta(currentNetFlow, previousNetFlow),
        },
        {
          label: "This Month Income",
          value: formatCurrency(summary.metrics.currentMonthIncome),
          detail: `${summary.metrics.transactionCount} transactions recorded`,
          icon: TrendingUp,
          tone: "text-success",
          delta: getDeltaBadge(summary.metrics.currentMonthIncome, previousTrend?.income ?? 0, "vs last month"),
        },
        {
          label: "This Month Expense",
          value: formatCurrency(summary.metrics.currentMonthExpense),
          detail: `${summary.metrics.activeBudgetCount} active budgets`,
          icon: ReceiptText,
          tone: "text-danger",
          delta: getDeltaBadge(summary.metrics.currentMonthExpense, previousTrend?.expense ?? 0, "vs last month"),
        },
        {
          label: "Active Goals",
          value: `${summary.metrics.activeGoalCount}`,
          detail: "Savings plans in progress",
          icon: PiggyBank,
          tone: "text-accent",
          delta: {
            text: completedGoalsCount > 0 ? `${completedGoalsCount} completed` : "No completed goals yet",
            tone: completedGoalsCount > 0 ? "text-success" : "text-ink/50",
          },
        },
      ]
    : [];

  const planningMetrics = forecast
    ? [
        {
          label: "Projected Month-End Balance",
          value: formatCurrency(forecast.overview.projectedEndBalance),
          detail: `${forecast.overview.confidence} confidence outlook`,
          icon: TrendingUp,
          tone: "text-primary",
          delta: getDeltaBadge(forecast.overview.projectedEndBalance, forecast.overview.currentBalance, "vs today"),
        },
        {
          label: "Safe To Spend",
          value: formatCurrency(forecast.overview.safeToSpend),
          detail: `Buffer protected: ${formatCurrency(forecast.overview.protectedBuffer)}`,
          icon: WalletCards,
          tone: "text-success",
          delta: {
            text: forecast.overview.safeToSpend > 0 ? "Breathing room available" : "No discretionary room left",
            tone: forecast.overview.safeToSpend > 0 ? "text-success" : "text-danger",
          },
        },
        {
          label: "Scheduled Outflows",
          value: formatCurrency(forecast.overview.expectedRecurringExpense),
          detail: "Known recurring expenses ahead",
          icon: BarChart3,
          tone: "text-danger",
          delta: getDeltaBadge(forecast.overview.expectedRecurringExpense, forecast.overview.expectedPatternExpense, "vs flexible spend"),
        },
        {
          label: "Daily Spend Pace",
          value: `${formatCurrency(forecast.overview.averageDailyExpense)}/day`,
          detail: "Estimated from recent behaviour",
          icon: ShieldCheck,
          tone: "text-accent",
          delta: {
            text: forecast.patternCategories[0] ? `${forecast.patternCategories[0].categoryName} leads flexible spend` : "Waiting for more spend history",
            tone: "text-ink/58",
          },
        },
      ]
    : [];

  const streaks = useMemo<StreakCard[]>(() => {
    const trend = summary?.trend ?? [];
    const positiveCashFlowStreak = getStreakFromEnd(trend, (point) => point.income >= point.expense);
    const improvingExpenseStreak = getExpenseDisciplineStreak(trend);

    return [
      {
        title: "Positive cash-flow streak",
        value: `${positiveCashFlowStreak} ${positiveCashFlowStreak === 1 ? "month" : "months"}`,
        detail: positiveCashFlowStreak > 0 ? "Income has stayed ahead of expenses." : "No current positive cash-flow streak yet.",
        icon: Flame,
        tone: positiveCashFlowStreak > 0 ? "text-success" : "text-warning",
      },
      {
        title: "Expense-discipline streak",
        value: `${improvingExpenseStreak} ${improvingExpenseStreak === 1 ? "month" : "months"}`,
        detail: improvingExpenseStreak > 0 ? "Spending has not increased month over month." : "Expense discipline resets when a month spikes.",
        icon: Target,
        tone: improvingExpenseStreak > 0 ? "text-primary" : "text-ink/65",
      },
    ];
  }, [summary]);

  const monthlyReview = useMemo(() => {
    if (!summary) {
      return null;
    }

    const biggestCategoryName = topCategory?.categoryName ?? "No dominant category yet";
    const improvement = currentNetFlow - previousNetFlow;
    const strongestMessage = improvement >= 0
      ? `Net flow improved by ${formatCurrency(improvement)} compared with last month.`
      : `Net flow softened by ${formatCurrency(Math.abs(improvement))} compared with last month.`;

    return {
      saved: currentNetFlow,
      biggestCategoryName,
      biggestCategoryAmount: topCategory?.amount ?? 0,
      strongestMessage,
      nextFocus:
        healthScore?.suggestions[0]
        ?? forecast?.warnings[0]?.message
        ?? "Keep feeding the app with transactions, budgets, and recurring items to sharpen the next review.",
    };
  }, [summary, topCategory, currentNetFlow, previousNetFlow, healthScore, forecast]);

  const healthExplainability = useMemo(() => {
    if (!healthScore?.isAvailable) {
      return [];
    }

    const strongest = [...healthScore.factors].sort((left, right) => right.score - left.score)[0];
    const weakest = [...healthScore.factors].sort((left, right) => left.score - right.score)[0];
    return [
      strongest ? `Strongest driver: ${strongest.label} is helping because ${strongest.insight}` : null,
      weakest ? `Biggest drag: ${weakest.label} still needs attention. ${weakest.insight}` : null,
      healthScore.suggestions[0] ? `Fastest win: ${healthScore.suggestions[0]}` : null,
    ].filter(Boolean) as string[];
  }, [healthScore]);

  const forecastExplainability = useMemo(() => {
    if (!forecast) {
      return [];
    }

    return [
      forecast.overview.expectedRecurringExpense > 0
        ? `Known recurring outflows contribute ${formatCurrency(forecast.overview.expectedRecurringExpense)} to the remaining month.`
        : "There are no scheduled recurring expenses currently affecting the remaining month.",
      forecast.patternCategories[0]
        ? `${forecast.patternCategories[0].categoryName} is the biggest flexible-spend driver at ${formatCurrency(forecast.patternCategories[0].projectedAmount)}.`
        : "There is not enough flexible-spend history yet, so the pattern estimate remains conservative.",
      forecast.assumptions[0] ?? "Fitra assumes your current balance is the starting point for the rest of the month.",
    ];
  }, [forecast]);

  const calendarEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      title: string;
      amountLabel: string;
      tone: string;
      detail: string;
    }> = [];

    summary?.upcomingRecurring.forEach((item) => {
      events.push({
        id: `recurring-${item.id}`,
        date: item.nextRunDate,
        title: item.title,
        amountLabel: formatCurrency(item.amount),
        tone: "text-danger",
        detail: `${item.frequency} recurring bill`,
      });
    });

    forecast?.upcomingItems.forEach((item, index) => {
      events.push({
        id: `forecast-${item.recurringTransactionId ?? index}-${item.runDate}`,
        date: item.runDate,
        title: item.title,
        amountLabel: `${item.type === "income" ? "+" : "-"}${formatCurrency(item.amount)}`,
        tone: item.type === "income" ? "text-success" : "text-danger",
        detail: item.accountName ?? "Forecast event",
      });
    });

    summary?.goals
      .filter((goal) => goal.targetDate)
      .forEach((goal) => {
        events.push({
          id: `goal-${goal.goalId}`,
          date: goal.targetDate as string,
          title: goal.name,
          amountLabel: `${goal.progressPercent}%`,
          tone: "text-primary",
          detail: "Goal target date",
        });
      });

    return events
      .filter((event) => !!event.date)
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, 10);
  }, [forecast, summary]);

  const scenarioResult = useMemo(() => {
    if (!forecast) {
      return null;
    }

    const selectedDriver = forecast.patternCategories.find((item) => item.categoryName === simulation.categoryName)
      ?? forecast.patternCategories[0];

    const spendReduction = selectedDriver ? selectedDriver.projectedAmount * (simulation.diningReductionPercent / 100) : 0;
    const adjustedEndBalance = forecast.overview.projectedEndBalance + spendReduction + simulation.extraIncome - simulation.newMonthlySip;
    const adjustedSafeToSpend = forecast.overview.safeToSpend + spendReduction + simulation.extraIncome - simulation.newMonthlySip;

    return {
      originalEndBalance: forecast.overview.projectedEndBalance,
      adjustedEndBalance,
      adjustedSafeToSpend,
      spendReduction,
      driverName: selectedDriver?.categoryName ?? "Flexible spend",
    };
  }, [forecast, simulation]);

  const allUnavailable = !summary && !forecast && !healthScore;
  const activeTopInsight = activeView === "overview"
    ? dailyInsights[0] ?? null
    : forecastExplainability[0]
      ? {
          title: "Forecast insight",
          body: forecastExplainability[0],
          tone: "text-accent",
          icon: Sparkles,
        }
      : dailyInsights[1] ?? dailyInsights[0] ?? null;
  const ActiveTopInsightIcon = activeTopInsight?.icon;

  return (
    <section className="space-y-7">
      <PageIntro
        eyebrow="Dashboard"
        title="Your financial picture, organized with more intent"
        description="The home experience now separates today’s financial posture from the planning layer, while adding smarter guidance, celebration moments, and competition-grade product polish."
      />

      <section className="premium-hero overflow-hidden rounded-[1.8rem] p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="premium-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Command center
              </span>
              {healthScore?.isAvailable ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Health score {healthScore.score}/100
                </span>
              ) : null}
              {forecast?.warnings.length === 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Planning horizon looks stable
                </span>
              ) : null}
            </div>
            <h3 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-ink md:text-[2.5rem]">
              {activeView === "overview" ? "See where you stand right now." : "Plan what happens next before it arrives."}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/68 md:text-[15px]">
              {activeView === "overview"
                ? "Overview now blends score, signals, streaks, review highlights, and shared activity into a calmer decision surface."
                : "Planning keeps the forecast, budgets, bills, goals, and explainability together so the app feels genuinely intelligent."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                {
                  id: "overview" as const,
                  label: "Overview",
                  description: "Health, trends, streaks, and activity",
                },
                {
                  id: "planning" as const,
                  label: "Planning",
                  description: "Forecast, explainability, and goals",
                },
              ].map((view) => (
                <button
                  key={view.id}
                  className={[
                    "rounded-[1.15rem] px-4 py-3 text-left transition md:min-w-[210px]",
                    activeView === view.id ? "bg-primary text-white shadow-panel" : "premium-button-secondary",
                  ].join(" ")}
                  onClick={() => setActiveView(view.id)}
                  type="button"
                >
                  <p className="text-sm font-semibold">{view.label}</p>
                  <p className={activeView === view.id ? "mt-1 text-xs text-white/75" : "mt-1 text-xs text-ink/50"}>{view.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            {heroSignals.length > 0 ? (
              heroSignals.map((signal) => (
                <article key={signal.label} className="premium-card rounded-[1.35rem] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-ink/45">{signal.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">{signal.value}</p>
                  <p className="mt-2 text-sm text-ink/60">{signal.note}</p>
                </article>
              ))
            ) : (
              <SmartEmptyState
                title="Your dashboard will feel richer as data arrives."
                body="Add transactions, one budget, and one recurring item to unlock insight strips, health score explanations, streaks, and the month review."
                actionLabel="Open Transactions"
                onAction={() => navigate("/transactions")}
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-5 xl:flex-row xl:items-center xl:justify-between">
          {activeTopInsight ? (
            <div className="premium-card-soft flex items-start gap-3 rounded-[1.2rem] px-4 py-3 xl:max-w-[65%]">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 ${activeTopInsight.tone}`}>
                {ActiveTopInsightIcon ? <ActiveTopInsightIcon className="h-5 w-5" /> : null}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{activeTopInsight.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/65">{activeTopInsight.body}</p>
              </div>
            </div>
          ) : <div />}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="premium-button premium-button-secondary text-sm"
              onClick={() => setShowCustomize((current) => !current)}
              type="button"
            >
              {showCustomize ? "Hide layout controls" : "Customize layout"}
            </button>
            {showCelebration && celebration ? (
              <button className="text-sm font-semibold text-primary" onClick={() => setShowCelebration(false)} type="button">
                Dismiss celebration
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {showCelebration && celebration ? (
        <section className={["rounded-[1.4rem] border px-5 py-4", getCelebrationClasses(celebration.tone)].join(" ")}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
                <PartyPopper className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{celebration.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/70">{celebration.body}</p>
              </div>
            </div>
            <button className="text-sm font-semibold text-primary" onClick={() => setShowCelebration(false)} type="button">
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      {showCustomize ? (
        <section className="premium-card rounded-[1.45rem] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Customize this view</p>
              <p className="mt-1 text-sm text-ink/58">Pin the parts you want to keep visible. Preferences are saved on this device.</p>
            </div>
            <button className="premium-button premium-button-secondary self-start text-sm" onClick={resetDashboardPreferences} type="button">
              Reset Layout
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(activeView === "overview" ? overviewWidgetOptions : planningWidgetOptions).map((widget) => {
              const isActive = activeView === "overview" ? overviewWidgets.includes(widget.id as OverviewWidgetId) : planningWidgets.includes(widget.id as PlanningWidgetId);
              return (
                <button
                  key={widget.id}
                  className={[
                    "rounded-full px-3 py-2 text-sm font-medium transition",
                    isActive ? "bg-primary text-white shadow-panel" : "premium-button-secondary",
                  ].join(" ")}
                  onClick={() =>
                    activeView === "overview"
                      ? toggleOverviewWidget(widget.id as OverviewWidgetId)
                      : togglePlanningWidget(widget.id as PlanningWidgetId)
                  }
                  type="button"
                >
                  {widget.label}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {allUnavailable ? <EmptyPanel message="Dashboard data is not available right now." /> : null}

      {activeView === "overview" ? (
        <>
          {healthScore && overviewWidgets.includes("health") ? (
            healthScore.isAvailable ? (
              <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <article className="premium-card rounded-[1.7rem] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ink/45">Financial Health Score</p>
                      <div className="mt-4 flex items-end gap-3">
                        <h3 className="text-5xl font-semibold tracking-[-0.05em] text-ink">{healthScore.score}</h3>
                        <p className="pb-1 text-sm text-ink/55">out of 100</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{healthScore.band}</span>
                        <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">Factor avg {healthFactorAverage}</span>
                      </div>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <HeartPulse className="h-7 w-7" />
                    </div>
                  </div>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/70">{healthScore.summary}</p>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {healthScore.factors.map((factor) => (
                      <div key={factor.key} className="premium-card-soft rounded-[1.2rem] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-ink">{factor.label}</p>
                            <p className="mt-1 text-sm text-ink/55">{factor.valueLabel}</p>
                          </div>
                          <p className="text-sm font-semibold text-primary">{factor.score}/100</p>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-border/70">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(factor.score, 100)}%` }} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-ink/62">{factor.insight}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="premium-card rounded-[1.7rem] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ink/45">Suggested Focus</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">Small moves with the biggest payoff</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Target className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    {healthScore.suggestions.map((suggestion, index) => (
                      <div key={suggestion} className="premium-card-soft rounded-[1.2rem] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-primary/65">Priority {index + 1}</p>
                        <p className="mt-2 text-sm leading-7 text-ink/70">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            ) : (
              <SmartEmptyState
                title="Health score needs a bit more signal"
                body={healthScore.unavailableReason ?? "Add a few real income and expense entries plus one budget to unlock the score with confidence."}
                actionLabel="Open Budgets"
                onAction={() => navigate("/budgets")}
              />
            )
          ) : healthScoreMessage && overviewWidgets.includes("health") ? (
            <EmptyPanel message={healthScoreMessage} />
          ) : null}

          {summary && overviewWidgets.includes("metrics") ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewMetrics.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.label} className="premium-card rounded-[1.45rem] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-ink/58">{card.label}</p>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/65">
                        <Icon className={`h-5 w-5 ${card.tone}`} />
                      </div>
                    </div>
                    <p className={`mt-5 text-3xl font-semibold tracking-[-0.04em] ${card.tone}`}>{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/62">{card.detail}</p>
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.16em] ${card.delta.tone}`}>{card.delta.text}</p>
                  </article>
                );
              })}
            </section>
          ) : null}

          {summary && overviewWidgets.includes("category") ? (
            <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <section className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Category mix this month</h3>
                    <p className="mt-2 text-sm text-ink/60">The biggest expense buckets shaping your month.</p>
                  </div>
                  <span className="premium-pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/65">
                    Spend split
                  </span>
                </div>
                {summary.categorySpend.length === 0 ? (
                  <SmartEmptyState
                    title="No expense mix yet"
                    body="Once expense transactions arrive, Fitra will surface the categories shaping your month."
                    actionLabel="Add Transaction"
                    onAction={() => navigate("/transactions")}
                    compact
                  />
                ) : (
                  <>
                    <div className="mt-5 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={summary.categorySpend} dataKey="amount" nameKey="categoryName" innerRadius={62} outerRadius={98} paddingAngle={2}>
                            {summary.categorySpend.map((entry, index) => (
                              <Cell key={entry.categoryName} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`Rs ${value.toLocaleString("en-IN")}`, "Spent"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {summary.categorySpend.slice(0, 4).map((entry, index) => (
                        <div key={entry.categoryName} className="premium-card-soft flex items-center justify-between rounded-[1rem] px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                            <span className="text-sm font-medium text-ink">{entry.categoryName}</span>
                          </div>
                          <span className="text-sm text-ink/62">{formatCurrency(entry.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Income vs expense momentum</h3>
                    <p className="mt-2 text-sm text-ink/60">A simpler read on whether monthly movement is improving.</p>
                  </div>
                  <span className="premium-pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/65">
                    Trend
                  </span>
                </div>
                {summary.trend.length === 0 ? (
                  <SmartEmptyState
                    title="Trend line is waiting for more history"
                    body="A few months of transactions will make momentum and deltas much more interesting here."
                    actionLabel="Open Transactions"
                    onAction={() => navigate("/transactions")}
                    compact
                  />
                ) : (
                  <div className="mt-5 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={summary.trend}>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" />
                        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => `Rs ${Math.round(value / 1000)}k`} />
                        <Tooltip formatter={(value: number) => `Rs ${value.toLocaleString("en-IN")}`} />
                        <Line type="monotone" dataKey="income" stroke="#4C8B68" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="expense" stroke="#C4665E" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </section>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            {summary && overviewWidgets.includes("attention") ? (
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Where attention is needed</h3>
                    <p className="mt-2 text-sm text-ink/60">Fast signals from budgets and planning systems.</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div className="mt-5 space-y-3">
                  {summary.budgetProgress.length === 0 ? (
                    <SmartEmptyState
                      title="No budget signals yet"
                      body="Create a budget and Fitra will start calling out risk, overspend, and recovery signals here."
                      actionLabel="Create Budget"
                      onAction={() => navigate("/budgets")}
                      compact
                    />
                  ) : (
                    summary.budgetProgress.slice(0, 3).map((budget) => (
                      <div key={budget.budgetId} className="premium-card-soft rounded-[1.2rem] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-ink">{budget.categoryName}</p>
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                              budget.status === "over" ? "bg-danger/12 text-danger" : budget.status === "warning" ? "bg-warning/16 text-ink" : "bg-success/12 text-success",
                            ].join(" ")}
                          >
                            {budget.status}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-border/70">
                          <div
                            className={budget.status === "over" ? "h-2 rounded-full bg-danger" : budget.status === "warning" ? "h-2 rounded-full bg-warning" : "h-2 rounded-full bg-success"}
                            style={{ width: `${Math.min(budget.progressPercent, 100)}%` }}
                          />
                        </div>
                        <p className="mt-3 text-sm text-ink/62">
                          {formatCurrency(budget.spentAmount)} of {formatCurrency(budget.budgetAmount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ) : null}

            {summary && overviewWidgets.includes("recent") ? (
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Recent transactions</h3>
                    <p className="mt-2 text-sm text-ink/60">Latest movement across visible accounts.</p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-5 space-y-3">
                  {summary.recentTransactions.length === 0 ? (
                    <SmartEmptyState
                      title="No recent transactions yet"
                      body="Your live activity feed will appear here once the first few transactions are added."
                      actionLabel="Add Transaction"
                      onAction={() => navigate("/transactions")}
                      compact
                    />
                  ) : (
                    summary.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="premium-card-soft rounded-[1.15rem] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{transaction.merchant}</p>
                            <p className="mt-1 text-sm text-ink/55">
                              {transaction.transactionDate} • {transaction.accountName ?? "Account"} • {transaction.categoryName ?? "Category"}
                            </p>
                          </div>
                          <p className={transaction.type === "income" ? "shrink-0 font-semibold text-success" : "shrink-0 font-semibold text-danger"}>
                            {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ) : null}
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            {overviewWidgets.includes("streaks") ? (
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Financial streaks</h3>
                    <p className="mt-2 text-sm text-ink/60">Tiny motivation without the gimmicks.</p>
                  </div>
                  <Flame className="h-5 w-5 text-warning" />
                </div>
                <div className="mt-5 space-y-3">
                  {streaks.map((streak) => {
                    const Icon = streak.icon;
                    return (
                      <div key={streak.title} className="premium-card-soft rounded-[1.15rem] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/70 ${streak.tone}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-ink">{streak.title}</p>
                              <p className="mt-1 text-sm text-ink/58">{streak.detail}</p>
                            </div>
                          </div>
                          <p className={`text-lg font-semibold ${streak.tone}`}>{streak.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ) : null}

            {overviewWidgets.includes("review") ? (
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">End-of-month review</h3>
                    <p className="mt-2 text-sm text-ink/60">A productized summary of where the month is landing.</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                {monthlyReview ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="premium-card-soft rounded-[1.15rem] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Net outcome</p>
                      <p className={`mt-3 text-3xl font-semibold tracking-[-0.04em] ${monthlyReview.saved >= 0 ? "text-success" : "text-danger"}`}>
                        {monthlyReview.saved >= 0 ? "+" : "-"}{formatCurrency(Math.abs(monthlyReview.saved))}
                      </p>
                      <p className="mt-2 text-sm text-ink/62">{monthlyReview.strongestMessage}</p>
                    </div>
                    <div className="premium-card-soft rounded-[1.15rem] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Biggest category</p>
                      <p className="mt-3 text-xl font-semibold text-ink">{monthlyReview.biggestCategoryName}</p>
                      <p className="mt-2 text-sm text-ink/62">{formatCurrency(monthlyReview.biggestCategoryAmount)} shaped the month most.</p>
                    </div>
                    <div className="premium-card-soft rounded-[1.15rem] p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Next best move</p>
                      <p className="mt-3 text-sm leading-7 text-ink/70">{monthlyReview.nextFocus}</p>
                    </div>
                  </div>
                ) : (
                  <SmartEmptyState
                    title="Review card is waiting for data"
                    body="Once the app has some real movement, this card will summarize savings, largest category, and your best improvement."
                    actionLabel="Open Dashboard"
                    onAction={() => navigate("/")}
                    compact
                  />
                )}
              </article>
            ) : null}
          </section>

          {overviewWidgets.includes("activity") ? (
            <article className="premium-card rounded-[1.7rem] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Shared account activity timeline</h3>
                  <p className="mt-2 text-sm text-ink/60">A lighter collaboration signal that still feels premium.</p>
                </div>
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-5 space-y-3">
                {activityTimeline.length === 0 ? (
                  <SmartEmptyState
                    title="No shared activity yet"
                    body="Once a shared account sees transfers, edits, or member actions, the collaboration timeline will show up here."
                    actionLabel="Manage Accounts"
                    onAction={() => navigate("/accounts")}
                    compact
                  />
                ) : (
                  activityTimeline.map((item) => (
                    <div key={item.id} className="premium-card-soft rounded-[1.15rem] p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Activity className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-ink/65">{item.body}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink/42">{formatDateTimeLabel(item.createdAtUtc)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          ) : null}
        </>
      ) : (
        <>
          {forecast && planningWidgets.includes("forecast") ? (
            <section className="premium-card overflow-hidden rounded-[1.8rem]">
              <div className="grid gap-6 border-b border-border/70 px-6 py-6 xl:grid-cols-[1.18fr_0.82fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-ink/45">Cash Flow Forecast</p>
                  <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-ink">Know where the month is likely to land before it gets there.</h3>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/68">
                    Fitra starts from current balances, adds known recurring cash events, and estimates remaining everyday spend from recent behaviour.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {forecast.warnings.length === 0 ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
                        <ShieldCheck className="h-4 w-4" />
                        Forecast looks healthy right now
                      </span>
                    ) : (
                      forecast.warnings.slice(0, 2).map((warning) => (
                        <span
                          key={warning.message}
                          className={warning.severity === "high"
                            ? "inline-flex items-center gap-2 rounded-full bg-danger/10 px-4 py-2 text-sm font-medium text-danger"
                            : "inline-flex items-center gap-2 rounded-full bg-warning/15 px-4 py-2 text-sm font-medium text-ink"}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          {warning.message}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="premium-card-soft rounded-[1.35rem] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-ink/45">Forecast window</p>
                  <p className="mt-3 text-xl font-semibold tracking-[-0.02em] text-ink">
                    {forecast.asOfDate} to {forecast.throughDate}
                  </p>
                  <div className="mt-5 space-y-3 text-sm">
                    <ForecastStat label="Current balance" value={formatCurrency(forecast.overview.currentBalance)} tone="text-primary" />
                    <ForecastStat label="Scheduled income ahead" value={formatCurrency(forecast.overview.expectedRecurringIncome)} tone="text-success" />
                    <ForecastStat label="Scheduled expenses ahead" value={formatCurrency(forecast.overview.expectedRecurringExpense)} tone="text-danger" />
                    <ForecastStat label="Pattern-based estimate" value={formatCurrency(forecast.overview.expectedPatternExpense)} tone="text-ink" />
                  </div>
                </div>
              </div>

              {planningWidgets.includes("planning-metrics") ? (
                <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
                  {planningMetrics.map((card) => {
                    const Icon = card.icon;
                    return (
                      <article key={card.label} className="premium-card-soft rounded-[1.25rem] p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-ink/58">{card.label}</p>
                          <Icon className={`h-5 w-5 ${card.tone}`} />
                        </div>
                        <p className={`mt-4 text-3xl font-semibold tracking-[-0.04em] ${card.tone}`}>{card.value}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/62">{card.detail}</p>
                        <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.16em] ${card.delta.tone}`}>{card.delta.text}</p>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              <div className="grid gap-4 border-t border-border/70 px-6 py-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="premium-card-soft rounded-[1.35rem] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Projected daily balance</h3>
                      <p className="mt-2 text-sm text-ink/60">A day-by-day view of where your cash position is likely to settle.</p>
                    </div>
                    <span className="premium-pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/65">
                      {forecast.overview.confidence} confidence
                    </span>
                  </div>
                  <div className="mt-5 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast.dailyProjection}>
                        <defs>
                          <linearGradient id="forecastBalance" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#244B66" stopOpacity={0.36} />
                            <stop offset="95%" stopColor="#244B66" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => `Rs ${Math.round(value / 1000)}k`} />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = {
                              projectedBalance: "Projected balance",
                              scheduledIncome: "Scheduled income",
                              scheduledExpense: "Scheduled expense",
                              patternExpense: "Pattern expense",
                            };
                            return [formatCurrency(value), labels[name] ?? name];
                          }}
                        />
                        <Area type="monotone" dataKey="projectedBalance" stroke="#244B66" fill="url(#forecastBalance)" strokeWidth={3} />
                        <Line type="monotone" dataKey="scheduledExpense" stroke="#C4665E" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="space-y-4">
                  {planningWidgets.includes("upcoming") ? (
                    <article className="premium-card-soft rounded-[1.35rem] p-5">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Upcoming cash events</h3>
                      <div className="mt-4 space-y-3">
                        {forecast.upcomingItems.length === 0 ? (
                          <SmartEmptyState
                            title="No upcoming recurring items yet"
                            body="Add subscriptions, salary, or bills to make the forecast feel more alive and trustworthy."
                            actionLabel="Open Recurring"
                            onAction={() => navigate("/recurring")}
                            compact
                          />
                        ) : (
                          forecast.upcomingItems.map((item) => (
                            <div key={`${item.title}-${item.runDate}-${item.amount}`} className="premium-card rounded-[1.1rem] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink">{item.title}</p>
                                  <p className="mt-1 text-sm text-ink/55">
                                    {item.runDate} • {item.accountName ?? "Account"} • {item.categoryName ?? "No category"}
                                  </p>
                                </div>
                                <p className={item.type === "income" ? "shrink-0 font-semibold text-success" : "shrink-0 font-semibold text-danger"}>
                                  {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  ) : null}

                  {planningWidgets.includes("goals") ? (
                    <article className="premium-card-soft rounded-[1.35rem] p-5">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Expected spending drivers</h3>
                      <div className="mt-4 space-y-3">
                        {forecast.patternCategories.length === 0 ? (
                          <SmartEmptyState
                            title="Flexible-spend drivers need more history"
                            body="A bit more day-to-day expense data will reveal which categories shape the forecast most."
                            actionLabel="Add Expense"
                            onAction={() => navigate("/transactions")}
                            compact
                          />
                        ) : (
                          forecast.patternCategories.map((item) => (
                            <div key={item.categoryName} className="premium-card flex items-center justify-between gap-4 rounded-[1.1rem] p-4">
                              <p className="font-medium text-ink">{item.categoryName}</p>
                              <p className="font-semibold text-ink">{formatCurrency(item.projectedAmount)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  ) : null}
                </section>
              </div>
            </section>
          ) : forecastMessage && planningWidgets.includes("forecast") ? (
            <EmptyPanel message={forecastMessage} />
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
            {summary && planningWidgets.includes("budget") ? (
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Budget vs actual</h3>
                    <p className="mt-2 text-sm text-ink/60">A compact read on how close each budget is to pressure.</p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-5 space-y-3">
                  {summary.budgetProgress.length === 0 ? (
                    <SmartEmptyState
                      title="No budgets are shaping the plan yet"
                      body="Create one or duplicate last month to unlock a stronger planning experience."
                      actionLabel="Create Budget"
                      onAction={() => navigate("/budgets")}
                      compact
                    />
                  ) : (
                    summary.budgetProgress.map((budget) => (
                      <article key={budget.budgetId} className="premium-card-soft rounded-[1.15rem] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-ink">{budget.categoryName}</p>
                          <p className="text-sm text-ink/55">
                            {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.budgetAmount)}
                          </p>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-border/70">
                          <div
                            className={budget.status === "over" ? "h-2 rounded-full bg-danger" : budget.status === "warning" ? "h-2 rounded-full bg-warning" : "h-2 rounded-full bg-success"}
                            style={{ width: `${Math.min(budget.progressPercent, 100)}%` }}
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </article>
            ) : null}

            {summary && planningWidgets.includes("goals") ? (
              <section className="grid gap-4">
                <article className="premium-card rounded-[1.7rem] p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Upcoming bills</h3>
                  <div className="mt-4 space-y-3">
                    {summary.upcomingRecurring.length === 0 ? (
                      <SmartEmptyState
                        title="Recurring bills have not been mapped yet"
                        body="Add rent, subscriptions, or salaries so planning feels proactive instead of reactive."
                        actionLabel="Open Recurring"
                        onAction={() => navigate("/recurring")}
                        compact
                      />
                    ) : (
                      summary.upcomingRecurring.map((item) => (
                        <div key={item.id} className="premium-card-soft rounded-[1.15rem] p-4">
                          <p className="font-semibold text-ink">{item.title}</p>
                          <p className="mt-1 text-sm text-ink/55">
                            {item.nextRunDate} • {item.frequency}
                          </p>
                          <p className="mt-2 text-sm font-medium text-danger">{formatCurrency(item.amount)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article className="premium-card rounded-[1.7rem] p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Savings goals</h3>
                  <div className="mt-4 space-y-3">
                    {summary.goals.length === 0 ? (
                      <SmartEmptyState
                        title="No goals are shaping future plans yet"
                        body="A single savings goal adds motivation, celebration moments, and better narrative to the dashboard."
                        actionLabel="Create Goal"
                        onAction={() => navigate("/goals")}
                        compact
                      />
                    ) : (
                      summary.goals.map((goal) => (
                        <div key={goal.goalId} className="premium-card-soft rounded-[1.15rem] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-ink">{goal.name}</p>
                            <p className="text-sm font-medium text-primary">{goal.progressPercent}%</p>
                          </div>
                          <p className="mt-1 text-sm text-ink/55">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </section>
            ) : null}
          </section>

          {planningWidgets.includes("explainability") ? (
            <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Why the health score looks this way</h3>
                    <p className="mt-2 text-sm text-ink/60">Explainability helps advanced features feel trustworthy.</p>
                  </div>
                  <BadgeHelp className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-5 space-y-3">
                  {healthExplainability.length === 0 ? (
                    <SmartEmptyState
                      title="Score explanations appear with more financial activity"
                      body="Once there is enough data for a real score, Fitra will explain the strongest drivers here."
                      actionLabel="Add Transaction"
                      onAction={() => navigate("/transactions")}
                      compact
                    />
                  ) : (
                    healthExplainability.map((item) => (
                      <div key={item} className="premium-card-soft rounded-[1.15rem] p-4">
                        <p className="text-sm leading-7 text-ink/70">{item}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Why the forecast changed</h3>
                    <p className="mt-2 text-sm text-ink/60">A premium feel comes from clarity, not mystery.</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div className="mt-5 space-y-3">
                  {forecastExplainability.length === 0 ? (
                    <SmartEmptyState
                      title="Forecast explainability will appear once the forecast is available"
                      body="Recurring items and a bit of spend history will make this panel much more useful."
                      actionLabel="Open Recurring"
                      onAction={() => navigate("/recurring")}
                      compact
                    />
                  ) : (
                    forecastExplainability.map((item) => (
                      <div key={item} className="premium-card-soft rounded-[1.15rem] p-4">
                        <p className="text-sm leading-7 text-ink/70">{item}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            {planningWidgets.includes("calendar") ? (
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Financial calendar view</h3>
                    <p className="mt-2 text-sm text-ink/60">A cleaner timeline for bills, forecast events, and goal dates.</p>
                  </div>
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-5 space-y-3">
                  {calendarEvents.length === 0 ? (
                    <SmartEmptyState
                      title="Calendar fills up as planning data arrives"
                      body="Recurring items, forecast events, and goal dates will turn this into a truly demo-friendly planning timeline."
                      actionLabel="Open Recurring"
                      onAction={() => navigate("/recurring")}
                      compact
                    />
                  ) : (
                    calendarEvents.map((event) => (
                      <div key={event.id} className="premium-card-soft rounded-[1.15rem] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-ink/45">{formatDateLabel(event.date)}</p>
                            <p className="mt-2 font-semibold text-ink">{event.title}</p>
                            <p className="mt-1 text-sm text-ink/58">{event.detail}</p>
                          </div>
                          <p className={`shrink-0 text-sm font-semibold ${event.tone}`}>{event.amountLabel}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ) : null}

            {planningWidgets.includes("simulation") ? (
              <article className="premium-card rounded-[1.7rem] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-ink">Scenario simulation</h3>
                    <p className="mt-2 text-sm text-ink/60">Try small “what if” changes before making them in real life.</p>
                  </div>
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                {scenarioResult ? (
                  <>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <label className="premium-card-soft rounded-[1.15rem] p-4 text-sm text-ink/75">
                        Category to test
                        <select
                          className="mt-3 w-full rounded-xl border border-border px-3 py-2"
                          onChange={(event) => setSimulation((current) => ({ ...current, categoryName: event.target.value }))}
                          value={simulation.categoryName}
                        >
                          {forecast?.patternCategories.map((item) => (
                            <option key={item.categoryName} value={item.categoryName}>
                              {item.categoryName}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-ink/55">Choose any forecasted flexible-spend category to model a cut.</p>
                      </label>
                      <label className="premium-card-soft rounded-[1.15rem] p-4 text-sm text-ink/75">
                        Cut {scenarioResult.driverName}
                        <input
                          className="mt-3 w-full rounded-xl border border-border px-3 py-2"
                          max="100"
                          min="0"
                          onChange={(event) => setSimulation((current) => ({ ...current, diningReductionPercent: Number(event.target.value) || 0 }))}
                          type="number"
                          value={simulation.diningReductionPercent}
                        />
                        <p className="mt-2 text-xs text-ink/55">Percent reduction in a major flexible-spend category.</p>
                      </label>
                      <label className="premium-card-soft rounded-[1.15rem] p-4 text-sm text-ink/75">
                        Extra income
                        <input
                          className="mt-3 w-full rounded-xl border border-border px-3 py-2"
                          min="0"
                          onChange={(event) => setSimulation((current) => ({ ...current, extraIncome: Number(event.target.value) || 0 }))}
                          type="number"
                          value={simulation.extraIncome}
                        />
                        <p className="mt-2 text-xs text-ink/55">Add a bonus, freelance payment, or other inflow.</p>
                      </label>
                      <label className="premium-card-soft rounded-[1.15rem] p-4 text-sm text-ink/75">
                        New SIP / investment
                        <input
                          className="mt-3 w-full rounded-xl border border-border px-3 py-2"
                          min="0"
                          onChange={(event) => setSimulation((current) => ({ ...current, newMonthlySip: Number(event.target.value) || 0 }))}
                          type="number"
                          value={simulation.newMonthlySip}
                        />
                        <p className="mt-2 text-xs text-ink/55">Model a new monthly commitment before adding it.</p>
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="premium-card-soft rounded-[1.15rem] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Simulated end balance</p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-primary">{formatCurrency(scenarioResult.adjustedEndBalance)}</p>
                        <p className="mt-2 text-sm text-ink/62">Current forecast: {formatCurrency(scenarioResult.originalEndBalance)}</p>
                      </div>
                      <div className="premium-card-soft rounded-[1.15rem] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Simulated safe to spend</p>
                        <p className={`mt-3 text-3xl font-semibold tracking-[-0.04em] ${scenarioResult.adjustedSafeToSpend >= 0 ? "text-success" : "text-danger"}`}>
                          {formatCurrency(scenarioResult.adjustedSafeToSpend)}
                        </p>
                        <p className="mt-2 text-sm text-ink/62">
                          Includes {formatCurrency(scenarioResult.spendReduction)} reduced from {scenarioResult.driverName}.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <SmartEmptyState
                    title="Simulation unlocks when forecast data is available"
                    body="Once the forecast has enough data, you will be able to test spending cuts, extra income, and new commitments here."
                    actionLabel="Open Dashboard"
                    onAction={() => navigate("/")}
                    compact
                  />
                )}
              </article>
            ) : null}
          </section>
        </>
      )}
    </section>
  );
}

function SmartEmptyState({
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
}) {
  return (
    <div className={["premium-empty rounded-[1.2rem]", compact ? "mt-4 p-4" : "p-5"].join(" ")}>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/62">{body}</p>
      <button className="premium-button premium-button-secondary mt-4 text-sm" onClick={onAction} type="button">
        {actionLabel}
      </button>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <section className="premium-empty rounded-[1.5rem] p-5">
      <p className="text-sm text-ink/70">{message}</p>
    </section>
  );
}

function ForecastStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/60">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function formatCurrency(value: number) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function roundToWhole(value: number) {
  return Math.round(value);
}

function getDeltaBadge(currentValue: number, previousValue: number, suffix: string): DeltaBadge {
  const delta = currentValue - previousValue;
  if (previousValue === 0 && currentValue === 0) {
    return { text: `No change ${suffix}`, tone: "text-ink/50" };
  }

  if (delta === 0) {
    return { text: `Flat ${suffix}`, tone: "text-ink/50" };
  }

  return {
    text: `${delta > 0 ? "+" : "-"}${formatCurrency(Math.abs(delta))} ${suffix}`,
    tone: delta > 0 ? "text-success" : "text-danger",
  };
}

function getNetFlowDelta(currentValue: number, previousValue: number): DeltaBadge {
  const delta = currentValue - previousValue;
  if (delta === 0) {
    return { text: "Same as last month", tone: "text-ink/50" };
  }

  return {
    text: `${delta > 0 ? "Improved" : "Lowered"} by ${formatCurrency(Math.abs(delta))}`,
    tone: delta > 0 ? "text-success" : "text-danger",
  };
}

function getStreakFromEnd<T>(items: T[], predicate: (item: T) => boolean) {
  let streak = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!predicate(items[index])) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function getExpenseDisciplineStreak(trend: Array<{ income: number; expense: number }>) {
  if (trend.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = trend.length - 1; index > 0; index -= 1) {
    if (trend[index].expense <= trend[index - 1].expense) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function getCelebrationClasses(tone: string) {
  if (tone === "success") {
    return "border-success/30 bg-success/8";
  }

  if (tone === "accent") {
    return "border-accent/30 bg-accent/10";
  }

  return "border-primary/25 bg-primary/8";
}

function formatDateTimeLabel(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateLabel(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}
