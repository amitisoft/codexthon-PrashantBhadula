import { EmptyFeatureState } from "@/components/ui/EmptyFeatureState";
import { PageIntro } from "@/components/ui/PageIntro";

type FeaturePlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction: string;
  emptyHint: string;
};

export function FeaturePlaceholderPage(props: FeaturePlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow={props.eyebrow}
        title={props.title}
        description={props.description}
      />
      <EmptyFeatureState
        title={props.emptyTitle}
        description={props.emptyDescription}
        primaryAction={props.emptyAction}
        secondaryHint={props.emptyHint}
      />
    </section>
  );
}
