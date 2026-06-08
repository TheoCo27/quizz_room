import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import Input from "../ui/input";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import {
  QUIZ_ANSWER_MAX_LENGTH,
  QUIZ_QUESTION_MAX_LENGTH,
} from "../../utils/input-validation";

type QuestionComposerProps = {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  error: string | null;
  onQuestionTextChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onCorrectAnswerChange: (index: number) => void;
  onValidateQuestion: () => void;
  onValidateAndAddQuestion: () => void;
};

export default function QuestionComposer({
  questionText,
  options,
  correctAnswerIndex,
  error,
  onQuestionTextChange,
  onOptionChange,
  onCorrectAnswerChange,
  onValidateQuestion,
  onValidateAndAddQuestion,
}: QuestionComposerProps) {
  return (
    <Section>
      <SectionLabel className="text-text-muted">
        Creer une question
      </SectionLabel>
      <SectionHeader>Composer la manche</SectionHeader>
      <p className="mt-2 text-sm text-text-muted">
        Ecris la question, remplis les 4 options puis choisis la bonne reponse.
      </p>

      <label className="flex flex-col gap-1 mt-8" htmlFor="question-text">
        <span className="text-sm font-medium">Question</span>
        <textarea
          id="question-text"
          className="cyber-input mt-2 min-h-24 max-h-96 w-full"
          placeholder="Quel studio a cree Journey ?"
          value={questionText}
          onChange={(event) => onQuestionTextChange(event.target.value)}
          minLength={6}
          maxLength={QUIZ_QUESTION_MAX_LENGTH}
          required
        />
      </label>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {options.map((option, index) => {
          const isCorrect = correctAnswerIndex === index;

          return (
            <div
              key={`option-${index + 1}`}
              className={[
                "rounded-3xl border px-4 py-4 transition",
                isCorrect
                  ? "border-success/50 bg-success/10 text-success"
                  : "border-white/10 bg-white/6 text-text-muted",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <label
                  className={[
                    "text-sm font-semibold",
                    isCorrect ? "text-success" : "text-text-muted",
                  ].join(" ")}
                  htmlFor={`option-${index + 1}`}
                >
                  Option {index + 1}
                </label>
                <button
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] transition-colors",
                    isCorrect
                      ? "border-success/60 bg-success/15 text-success"
                      : "border-white/10 bg-white/5 text-text-muted hover:border-primary/40 hover:text-text",
                  ].join(" ")}
                  type="button"
                  onClick={() => onCorrectAnswerChange(index)}
                >
                  {isCorrect ? "Bonne" : "Choisir"}
                </button>
              </div>
              <Input
                id={`option-${index + 1}`}
                className={`mt-3 w-full ${isCorrect ? "border-success/40 focus:border-success" : ""
                  }`}
                placeholder={`Reponse ${index + 1}`}
                value={option}
                onChange={(event) => onOptionChange(index, event.target.value)}
                maxLength={QUIZ_ANSWER_MAX_LENGTH}
                required
              />
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton
          className="w-full sm:w-auto"
          onClick={onValidateQuestion}
          disabled={
            !questionText.trim() ||
            options.length !== 4 ||
            options.some((opt) => !opt.trim())
          }
        >
          Valider la question
        </SecondaryButton>
        <PrimaryButton
          className="w-full sm:w-auto"
          onClick={onValidateAndAddQuestion}
          disabled={
            !questionText.trim() ||
            options.length !== 4 ||
            options.some((opt) => !opt.trim())
          }
        >
          Valider et ajouter une question
        </PrimaryButton>
      </div>
    </Section>
  );
}
