import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OverviewWidgetId =
  | "health"
  | "metrics"
  | "category"
  | "attention"
  | "recent"
  | "streaks"
  | "review"
  | "activity";

export type PlanningWidgetId =
  | "forecast"
  | "planning-metrics"
  | "budget"
  | "upcoming"
  | "goals"
  | "explainability"
  | "calendar"
  | "simulation";

type DashboardPreferencesState = {
  overviewWidgets: OverviewWidgetId[];
  planningWidgets: PlanningWidgetId[];
  toggleOverviewWidget: (widget: OverviewWidgetId) => void;
  togglePlanningWidget: (widget: PlanningWidgetId) => void;
  reset: () => void;
};

const defaultOverviewWidgets: OverviewWidgetId[] = [
  "health",
  "metrics",
  "category",
  "attention",
  "recent",
  "streaks",
  "review",
  "activity",
];

const defaultPlanningWidgets: PlanningWidgetId[] = [
  "forecast",
  "planning-metrics",
  "budget",
  "upcoming",
  "goals",
  "explainability",
  "calendar",
  "simulation",
];

function toggleWidget<T extends string>(widgets: T[], widget: T, defaults: T[]) {
  if (widgets.includes(widget)) {
    return widgets.length === 1 ? widgets : widgets.filter((item) => item !== widget);
  }

  return defaults.filter((item) => widgets.includes(item) || item === widget);
}

export const useDashboardPreferencesStore = create<DashboardPreferencesState>()(
  persist(
    (set, get) => ({
      overviewWidgets: defaultOverviewWidgets,
      planningWidgets: defaultPlanningWidgets,
      toggleOverviewWidget: (widget) =>
        set({
          overviewWidgets: toggleWidget(get().overviewWidgets, widget, defaultOverviewWidgets),
        }),
      togglePlanningWidget: (widget) =>
        set({
          planningWidgets: toggleWidget(get().planningWidgets, widget, defaultPlanningWidgets),
        }),
      reset: () =>
        set({
          overviewWidgets: defaultOverviewWidgets,
          planningWidgets: defaultPlanningWidgets,
        }),
    }),
    {
      name: "pft-dashboard-preferences",
    },
  ),
);
