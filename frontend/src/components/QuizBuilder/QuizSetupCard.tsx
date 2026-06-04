import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import Input from "../ui/input";
import { QUIZ_TITLE_MAX_LENGTH } from "../../utils/input-validation";

type QuizSetupCardProps = {
  title: string;
  onTitleChange: (value: string) => void;
};

export default function QuizSetupCard({
  title,
  onTitleChange,
}: QuizSetupCardProps) {
  return (
    <Section>
      <SectionLabel className="text-text-muted">Setup quiz</SectionLabel>
      <SectionHeader>Nom du quiz</SectionHeader>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Donne une identite claire a ton quiz. Ce titre servira de repere dans
        l'administration et les futurs parcours de jeu.
      </p>

      <label className="flex flex-col gap-2 mt-11" htmlFor="quiz-title">
        <span className="text-sm font-medium">Nom du quiz</span>
        <Input
          id="quiz-title"
          className="w-full"
          placeholder="Ex: Histoire du jeu video"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          minLength={2}
          maxLength={QUIZ_TITLE_MAX_LENGTH}
          required
        />
      </label>
    </Section>
  );
}
