import { CyberSelect } from "../cyber";
import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";

type QuizRulesCardProps = {
  value: 10 | 30 | "unlimited";
  onChange: (value: 10 | 30 | "unlimited") => void;
};

export default function QuizRulesCard({ value, onChange }: QuizRulesCardProps) {
  return (
    <Section>
      <SectionLabel className="text-text-muted">Regles du quiz</SectionLabel>
      <SectionHeader>Temps par question</SectionHeader>
      <p className="mt-2 text-sm text-text-muted">
        Choisis le temps dont les joueurs disposeront pour repondre a chaque
        question.
      </p>

      <label
        className="mt-6 block text-sm font-medium text-text-muted"
        htmlFor="quiz-duration"
      >
        Temps
      </label>
      <div className="mt-2">
        <CyberSelect
          id="quiz-duration"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === "10" || nextValue === "30") {
              onChange(Number(nextValue) as 10 | 30);
              return;
            }
            onChange("unlimited");
          }}
        >
          <option value="10">10 sec</option>
          <option value="30">30 sec</option>
          <option value="unlimited">Illimite</option>
        </CyberSelect>
      </div>
    </Section>
  );
}
