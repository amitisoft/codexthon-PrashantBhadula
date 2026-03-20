import { CheckCircle2, Circle } from "lucide-react";
import { PageIntro } from "@/components/ui/PageIntro";

const steps = [
  { label: "Create your account", done: true },
  { label: "Add your first bank or wallet account", done: false },
  { label: "Optionally set your first monthly budget", done: false },
  { label: "Land on a personalized dashboard", done: false },
];

export function OnboardingPage() {
  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Onboarding"
        title="A focused first-run setup"
        description="The onboarding experience will guide users from sign up to their first account, optional first budget, and an immediately useful dashboard without overwhelming them."
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold text-ink">Planned first-run flow</h3>
          <div className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <div key={step.label} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 text-ink/35" />
                )}
                <div>
                  <p className="text-sm text-ink/55">Step {index + 1}</p>
                  <p className="mt-1 font-medium text-ink">{step.label}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold text-ink">Why this matters</h3>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-ink/70">
            <li>It reduces the blank-screen problem on first launch.</li>
            <li>It makes the dashboard meaningful before deeper features exist.</li>
            <li>It aligns tightly with the acceptance criteria in your requirements.</li>
          </ul>
        </article>
      </section>
    </section>
  );
}
