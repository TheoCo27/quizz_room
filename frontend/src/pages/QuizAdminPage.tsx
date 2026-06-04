import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionComposer from "../components/QuizBuilder/QuestionComposer";
import QuizRulesCard from "../components/QuizBuilder/QuizRulesCard";
import QuizSetupCard from "../components/QuizBuilder/QuizSetupCard";
import { CyberBadge, CyberButton, CyberCard } from "../components/cyber";
import PrimaryButton from "../components/ui/PrimaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingErrorMessage } from "../services/api";
import { createQuiz, getQuizById, updateQuiz } from "../services/quizzes";
import {
  QUIZ_ANSWER_MAX_LENGTH,
  QUIZ_QUESTION_MAX_LENGTH,
  QUIZ_TITLE_MAX_LENGTH,
  normalizeInput,
  validateSafeText,
} from "../utils/input-validation";

type DraftQuestion = {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
};

const EMPTY_DRAFT: DraftQuestion = {
  questionText: "",
  options: ["", "", "", ""],
  correctAnswerIndex: 0,
};

export default function QuizAdminPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { user, isLoading } = useAuthSession();
  const [title, setTitle] = useState("");
  const [rule, setRule] = useState<10 | 30 | "unlimited">(10);
  const [draftQuestion, setDraftQuestion] =
    useState<DraftQuestion>(EMPTY_DRAFT);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);

  useEffect(() => {
    if (isEditing && id) {
      getQuizById(parseInt(id, 10))
        .then((quiz) => {
          setTitle(quiz.title);
          setRule(quiz.questionDurationSec === null || quiz.questionDurationSec === 0 ? "unlimited" : (quiz.questionDurationSec as 10 | 30));
          setQuestions(
            quiz.questions.map((q) => ({
              questionText: q.questionText,
              options: q.answers,
              correctAnswerIndex: q.answers.indexOf(q.correctAnswer) !== -1 ? q.answers.indexOf(q.correctAnswer) : 0,
            }))
          );
        })
        .catch((error) => {
          setSubmitError(getUserFacingErrorMessage(error, "Impossible de charger le quiz."));
        })
        .finally(() => {
          setIsFetching(false);
        });
    }
  }, [id, isEditing]);

  const validateDraftQuestion = () => {
    const questionError = validateSafeText(draftQuestion.questionText, {
      label: "La question",
      minLength: 6,
      maxLength: QUIZ_QUESTION_MAX_LENGTH,
    });
    if (questionError) return questionError;

    for (const option of draftQuestion.options) {
      const optionError = validateSafeText(option, {
        label: "Chaque réponse",
        minLength: 1,
        maxLength: QUIZ_ANSWER_MAX_LENGTH,
      });
      if (optionError) return optionError;
    }

    // Check for duplicate options
    const normalizedOptions = draftQuestion.options.map((option) =>
      normalizeInput(option).toLowerCase(),
    );
    const uniqueOptions = new Set(normalizedOptions);
    if (uniqueOptions.size < 4) {
      return "Les options de réponse doivent être uniques.";
    }

    return null;
  };

  const saveDraftQuestion = (resetAfterSave: boolean) => {
    const error = validateDraftQuestion();
    if (error) {
      setQuestionError(error);
      return false;
    }

    const normalizedQuestion: DraftQuestion = {
      questionText: draftQuestion.questionText.trim(),
      options: draftQuestion.options.map((option) => option.trim()),
      correctAnswerIndex: draftQuestion.correctAnswerIndex,
    };

    setQuestions((currentQuestions) => [
      ...currentQuestions,
      normalizedQuestion,
    ]);
    setQuestionError(null);

    if (resetAfterSave) {
      setDraftQuestion(EMPTY_DRAFT);
    }

    return true;
  };

  const handleValidateQuestion = () => {
    void saveDraftQuestion(false);
  };

  const handleValidateAndAddQuestion = () => {
    void saveDraftQuestion(true);
  };

  const handleSubmitQuiz = async () => {
    setSubmitError(null);

    if (!user) {
      navigate("/login");
      return;
    }

    const titleError = validateSafeText(title, {
      label: "Le nom du quiz",
      minLength: 2,
      maxLength: QUIZ_TITLE_MAX_LENGTH,
    });

    if (titleError) {
      setSubmitError(titleError);
      return;
    }

    if (questions.length === 0) {
      setSubmitError("Ajoute au moins une question avant de valider le quiz.");
      return;
    }

    for (const question of questions) {
      const questionError = validateSafeText(question.questionText, {
        label: "La question",
        minLength: 6,
        maxLength: QUIZ_QUESTION_MAX_LENGTH,
      });

      if (questionError) {
        setSubmitError(questionError);
        return;
      }

      for (const option of question.options) {
        const optionError = validateSafeText(option, {
          label: "Chaque réponse",
          minLength: 1,
          maxLength: QUIZ_ANSWER_MAX_LENGTH,
        });

        if (optionError) {
          setSubmitError(optionError);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: normalizeInput(title),
        questionDurationSec: (rule === "unlimited" ? 0 : rule) as 0 | 10 | 30 | null,
        questions: questions.map((question) => ({
          questionText: question.questionText,
          answers: question.options,
          correctAnswerIndex: question.correctAnswerIndex,
        })),
      };

      if (isEditing && id) {
        await updateQuiz(parseInt(id, 10), payload);
      } else {
        await createQuiz(payload);
      }

      navigate(isEditing ? "/profile" : "/");
    } catch (error) {
      setSubmitError(
        getUserFacingErrorMessage(error, isEditing ? "Impossible de modifier le quiz." : "Impossible de creer le quiz."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
        <p className="text-text-muted">Chargement du quiz...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <QuizSetupCard title={title} onTitleChange={setTitle} />
        <QuizRulesCard value={rule} onChange={setRule} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <QuestionComposer
          questionText={draftQuestion.questionText}
          options={draftQuestion.options}
          correctAnswerIndex={draftQuestion.correctAnswerIndex}
          error={questionError}
          onQuestionTextChange={(value) =>
            setDraftQuestion((currentDraft) => ({
              ...currentDraft,
              questionText: value,
            }))
          }
          onOptionChange={(index, value) =>
            setDraftQuestion((currentDraft) => ({
              ...currentDraft,
              options: currentDraft.options.map((option, optionIndex) =>
                optionIndex === index ? value : option,
              ),
            }))
          }
          onCorrectAnswerChange={(index) =>
            setDraftQuestion((currentDraft) => ({
              ...currentDraft,
              correctAnswerIndex: index,
            }))
          }
          onValidateQuestion={handleValidateQuestion}
          onValidateAndAddQuestion={handleValidateAndAddQuestion}
        />

        <CyberCard
          className={`rounded-4xl p-6 ${questions.length > 1 ? "" : "h-fit"} flex flex-col overflow-hidden`}
          accent="magenta"
        >
          <p className="cyber-eyebrow">Quiz construit</p>
          <h2 className="mt-2 cyber-title text-lg text-text">
            Questions validees
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            {questions.length} question{questions.length > 1 ? "s" : ""} prete
            {questions.length > 1 ? "s" : ""} a jouer.
          </p>

          <div className="mt-6 space-y-4 overflow-y-auto max-h-[min(45vh,40rem)]">
            {questions.length > 0 ? (
              questions.map((question, index) => (
                <article
                  key={`${question.questionText}-${index + 1}`}
                  className="rounded-3xl border border-white/10 bg-white/6 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <CyberBadge variant="info">Question {index + 1}</CyberBadge>
                    <CyberButton
                      size="sm"
                      variant="danger"
                      glow={false}
                      onClick={() =>
                        setQuestions((currentQuestions) =>
                          currentQuestions.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                    >
                      Supprimer
                    </CyberButton>
                  </div>
                  <p className="mt-3 text-base font-medium text-text">
                    {question.questionText}
                  </p>
                  <ol className="mt-4 space-y-2 text-sm text-text-muted">
                    {question.options.map((option, optionIndex) => (
                      <li
                        key={`${option}-${optionIndex + 1}`}
                        className={[
                          "rounded-xl border px-3 py-2",
                          question.correctAnswerIndex === optionIndex
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-white/10 bg-white/6",
                        ].join(" ")}
                      >
                        {option}
                      </li>
                    ))}
                  </ol>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/18 px-4 py-6 text-sm text-text-muted">
                Aucune question validée pour l'instant.
              </div>
            )}
          </div>

          {submitError ? (
            <p className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {submitError}
            </p>
          ) : null}

          <PrimaryButton
            className="mt-6 w-full justify-center"
            disabled={isLoading || isSubmitting || questions.length < 1}
            onClick={() => {
              void handleSubmitQuiz();
            }}
          >
            {isSubmitting ? "Validation..." : "Valider le quiz"}
          </PrimaryButton>
        </CyberCard>
      </div>
    </main>
  );
}
