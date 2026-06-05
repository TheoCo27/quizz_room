import type { PrismaClient } from "@generated/prisma/client";

type DefaultQuizQuestion = {
  questionText: string;
  answers: string[];
  correctAnswer: string;
  points: number;
};

type DefaultQuiz = {
  id: number;
  title: string;
  questionDurationSec: number | null;
  questions: DefaultQuizQuestion[];
};

export const DEFAULT_QUIZZES: DefaultQuiz[] = [
  {
    id: 1001,
    title: "Harry Potter",
    questionDurationSec: 10,
    questions: [
      {
        questionText: "Quelle maison accueille Harry à Poudlard ?",
        answers: ["Serdaigle", "Poufsouffle", "Gryffondor", "Serpentard"],
        correctAnswer: "Gryffondor",
        points: 100,
      },
      {
        questionText: "Quel est le prénom de Dumbledore ?",
        answers: ["Albus", "Aberforth", "Sirius", "Remus"],
        correctAnswer: "Albus",
        points: 100,
      },
      {
        questionText: "Quel objet permet de voir ses désirs les plus profonds ?",
        answers: [
          "La Pensine",
          "Le Miroir du Riséd",
          "La Cape d’invisibilité",
          "Le Retourneur de Temps",
        ],
        correctAnswer: "Le Miroir du Riséd",
        points: 100,
      },
      {
        questionText: "Qui est le parrain de Harry ?",
        answers: [
          "Remus Lupin",
          "Sirius Black",
          "Severus Rogue",
          "Arthur Weasley",
        ],
        correctAnswer: "Sirius Black",
        points: 100,
      },
      {
        questionText: "Quel sort permet de désarmer un adversaire ?",
        answers: ["Expelliarmus", "Avada Kedavra", "Stupefix", "Lumos"],
        correctAnswer: "Expelliarmus",
        points: 100,
      },
    ],
  },
  {
    id: 1002,
    title: "Valorant",
    questionDurationSec: 10,
    questions: [
      {
        questionText: "Quel agent peut poser une tourelle automatique ?",
        answers: ["Killjoy", "Sage", "Jett", "Reyna"],
        correctAnswer: "Killjoy",
        points: 100,
      },
      {
        questionText: "Quelle arme est un sniper puissant à un tir ?",
        answers: ["Vandal", "Phantom", "Operator", "Spectre"],
        correctAnswer: "Operator",
        points: 100,
      },
      {
        questionText:
          "Quel agent peut lancer des smokes (nuages de fumée) depuis la map ?",
        answers: ["Phoenix", "Brimstone", "Raze", "Yoru"],
        correctAnswer: "Brimstone",
        points: 100,
      },
      {
        questionText: "Combien de joueurs par équipe dans une partie classique ?",
        answers: ["4", "5", "6", "10"],
        correctAnswer: "5",
        points: 100,
      },
      {
        questionText: "Quel est l’objectif principal en attaque ?",
        answers: [
          "Défendre la spike",
          "Poser la spike",
          "Éliminer tous les ennemis uniquement",
          "Capturer une zone",
        ],
        correctAnswer: "Poser la spike",
        points: 100,
      },
    ],
  },
  {
    id: 1003,
    title: "Cinéma",
    questionDurationSec: 10,
    questions: [
      {
        questionText: "Qui a réalisé “Titanic” ?",
        answers: [
          "Steven Spielberg",
          "James Cameron",
          "Christopher Nolan",
          "Ridley Scott",
        ],
        correctAnswer: "James Cameron",
        points: 100,
      },
      {
        questionText:
          "Dans quel film trouve-t-on le personnage de Joker joué par Heath Ledger ?",
        answers: [
          "Batman Begins",
          "The Dark Knight",
          "Joker",
          "Suicide Squad",
        ],
        correctAnswer: "The Dark Knight",
        points: 100,
      },
      {
        questionText: "Quel film a remporté l’Oscar du meilleur film en 2020 ?",
        answers: [
          "1917",
          "Joker",
          "Parasite",
          "Once Upon a Time in Hollywood",
        ],
        correctAnswer: "Parasite",
        points: 100,
      },
      {
        questionText: "Qui joue Iron Man dans le MCU ?",
        answers: [
          "Chris Evans",
          "Chris Hemsworth",
          "Robert Downey Jr.",
          "Mark Ruffalo",
        ],
        correctAnswer: "Robert Downey Jr.",
        points: 100,
      },
      {
        questionText: "Dans quel film entend-on “May the Force be with you” ?",
        answers: ["Star Trek", "Star Wars", "Avatar", "Dune"],
        correctAnswer: "Star Wars",
        points: 100,
      },
    ],
  },
  {
    id: 1004,
    title: "Cyberpunk 2077",
    questionDurationSec: 10,
    questions: [
      {
        questionText: "Qui a conçu le pistolet fétiche de Johnny Silverhand, le modèle '3516' ?",
        answers: ["Malorian Arms", "Arasaka", "Militech", "Constitutional Arms"],
        correctAnswer: "Malorian Arms",
        points: 100,
      },
      {
        questionText: "Pour quelle corporation travaillait Alt Cunningham lorsqu'elle a créé la première version de Soulkiller ?",
        answers: ["ITS", "Arasaka", "Militech", "Microtech"],
        correctAnswer: "ITS",
        points: 100,
      },
      {
        questionText: "Quel est le nom de l'agent de NetWatch stationné dans le Grand Imperial Mall à Pacifica que V rencontre dans la mission 'I Walk the Line' ?",
        answers: ["Bryce Mosley", "Dennis Cranmer", "Kurt Hansen", "NetWatch Prime"],
        correctAnswer: "Bryce Mosley",
        points: 100,
      },
      {
        questionText: "Quel véhicule V possède-t-il/elle au début de son parcours de Nomade, et qu'il/elle peut récupérer plus tard via une quête secondaire ?",
        answers: ["Thorton Galena 'Rattler'", "Archer Hella EC-D I360", "Quadra Turbo-R V-Tech", "Mizutani Shion 'Coyote'"],
        correctAnswer: "Thorton Galena 'Rattler'",
        points: 100,
      },
      {
        questionText: "Quel maire de Night City décède mystérieusement au début du jeu, déclenchant l'enquête de Jefferson Peralez ?",
        answers: ["Lucius Rhyne", "Weldon Holt", "Mitch Anderson", "Richard Night"],
        correctAnswer: "Lucius Rhyne",
        points: 100,
      },
      {
        questionText: "Quel est le nom complet du garde du corps personnel de Hanako Arasaka, expert en lames Mantis, que l'on affronte en boss ?",
        answers: ["Sandayu Oda", "Goro Takemura", "Adam Smasher", "Arthur Jenkins"],
        correctAnswer: "Sandayu Oda",
        points: 100,
      },
      {
        questionText: "Dans la quête 'Sinnerman', quel condamné à mort V doit-il/elle accompagner dans son projet de crucifixion médiatisée ?",
        answers: ["Joshua Stephenson", "Bill Jablonsky", "Rachel Kasich", "Vasquez"],
        correctAnswer: "Joshua Stephenson",
        points: 100,
      },
      {
        questionText: "À quel Fixeur célèbre de Night City appartenait originellement le pistolet intelligent doté d'une IA parlante nommé 'Skippy' ?",
        answers: ["Regina Jones", "Padre (Sebastian Ibarra)", "Rogue Amendiares", "Dakota Smith"],
        correctAnswer: "Regina Jones",
        points: 100,
      },
      {
        questionText: "Quel mercenaire de légende, rival historique d'Adam Smasher, est connu sous le nom de 'l'homme au bras noir' ?",
        answers: ["Morgan Blackhand", "Spider Murphy", "Andrew Weyland", "Santiago Aldecaldo"],
        correctAnswer: "Morgan Blackhand",
        points: 100,
      },
      {
        questionText: "Dans l'extension Phantom Liberty, quel est le véritable nom complet de la netrunneuse d'élite de la FIA connue sous le pseudonyme de 'Songbird' ?",
        answers: ["So Mi Song", "Hanako Arasaka", "Alt Cunningham", "Rosalind Myers"],
        correctAnswer: "So Mi Song",
        points: 100,
      },
    ],
  },
];

export async function upsertDefaultQuizzes(prisma: PrismaClient): Promise<void> {
  for (const quiz of DEFAULT_QUIZZES) {
    await prisma.quiz.upsert({
      where: { id: quiz.id },
      update: {
        title: quiz.title,
        questionDurationSec: quiz.questionDurationSec,
        questions: {
          deleteMany: {},
          create: quiz.questions.map((question, index) => ({
            questionText: question.questionText,
            answers: question.answers,
            correctAnswer: question.correctAnswer,
            position: index + 1,
            points: question.points,
          })),
        },
      },
      create: {
        id: quiz.id,
        title: quiz.title,
        questionDurationSec: quiz.questionDurationSec,
        questions: {
          create: quiz.questions.map((question, index) => ({
            questionText: question.questionText,
            answers: question.answers,
            correctAnswer: question.correctAnswer,
            position: index + 1,
            points: question.points,
          })),
        },
      },
    });
  }
}
