import { FeaturePlaceholderPage } from "@/features/shared/FeaturePlaceholderPage";

export function SettingsPage() {
  return (
    <FeaturePlaceholderPage
      eyebrow="Settings"
      title="Control preferences without breaking flow"
      description="Settings will manage profile details, security preferences, default currency, locale, and the user-level defaults that make financial entry faster."
      emptyTitle="Preferences will appear here"
      emptyDescription="V1 settings will include currency and locale changes, with the default starting point set to INR and en-IN as requested."
      emptyAction="Review Defaults"
      emptyHint="Default locale: en-IN. Default currency: INR. Both should remain editable."
    />
  );
}
