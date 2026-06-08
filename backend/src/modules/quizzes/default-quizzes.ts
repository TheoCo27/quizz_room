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
  {
    id: 1005,
    title: "Valorant (Hardcore)",
    questionDurationSec: 10,
    questions: [
      {
        questionText: "Combien de points de vie (HP) possède l'agent KAY/O lorsqu'il est à terre (downed) sous son ultime CMD/annulation (NULL/cmd) ?",
        answers: ["500 HP", "600 HP", "800 HP", "1000 HP"],
        correctAnswer: "800 HP",
        points: 100,
      },
      {
        questionText: "Quel est le rayon de diffusion maximum exact (en mètres) de l'ultime de Viper (Nid de vipères) ?",
        answers: ["15,5 mètres", "18,0 mètres", "20,5 mètres", "22,5 mètres"],
        correctAnswer: "22,5 mètres",
        points: 100,
      },
      {
        questionText: "Quel est le nom complet exact de l'agent Neon dans le lore du jeu ?",
        answers: [
          "Tala Nicole Dimaapi Valdez",
          "Maria Hyun Valdez",
          "Tala Nicole Valdez Dimaapi",
          "Tala Nicole Valeria"
        ],
        correctAnswer: "Tala Nicole Dimaapi Valdez",
        points: 100,
      },
      {
        questionText: "Quelle équipe a remporté la finale du tout premier VALORANT Champions en 2021 ?",
        answers: ["Sentinels", "Acend", "Gambit Esports", "Team Heretics"],
        correctAnswer: "Acend",
        points: 100,
      },
      {
        questionText: "À quelle vitesse maximale (en mètres par seconde) un joueur se déplace-t-il en courant avec son couteau équipé ?",
        answers: ["5,4 m/s", "6,0 m/s", "6,75 m/s", "7,2 m/s"],
        correctAnswer: "6,75 m/s",
        points: 100,
      },
      {
        questionText: "Combien de charges Jett possédait-elle au maximum pour sa compétence 'Nuage de fumée' (Cloudburst) lors de la bêta fermée ?",
        answers: ["1", "2", "3", "4"],
        correctAnswer: "3",
        points: 100,
      },
      {
        questionText: "Quelle est la durée exacte (en secondes) de la Cage Cybernétique de Cypher une fois qu'elle est activée ?",
        answers: ["6 secondes", "7 secondes", "8 secondes", "9 secondes"],
        correctAnswer: "7 secondes",
        points: 100,
      },
      {
        questionText: "Quelle équipe a remporté le tournoi international 'First Strike: Europe' en décembre 2020 ?",
        answers: ["G2 Esports", "Team Heretics", "Team Liquid", "FunPlus Phoenix"],
        correctAnswer: "Team Heretics",
        points: 100,
      },
      {
        questionText: "Quel est le coût en crédits de la compétence 'Orbe barrière' (mur) de l'agent Sage ?",
        answers: ["200 crédits", "300 crédits", "400 crédits", "500 crédits"],
        correctAnswer: "400 crédits",
        points: 100,
      },
      {
        questionText: "Quel est le nom de la toute première carte de Valorant à comporter trois sites de pose de Spike (A, B et C) ?",
        answers: ["Haven", "Lotus", "Bind", "Split"],
        correctAnswer: "Haven",
        points: 100,
      },
    ],
  },
  {
    id: 1006,
    title: "École 42 (Hardcore)",
    questionDurationSec: 10,
    questions: [
      {
        questionText: "Quel est le nom de l'équipe de l'administration système et technique (le staff technique) de l'école 42 ?",
        answers: ["Le Bocal", "La Piscine", "La Moulinette", "Le Clavier"],
        correctAnswer: "Le Bocal",
        points: 100,
      },
      {
        questionText: "Combien de lignes comporte exactement le header standard de 42 inséré en haut des fichiers source C ?",
        answers: ["9 lignes", "10 lignes", "11 lignes", "12 lignes"],
        correctAnswer: "11 lignes",
        points: 100,
      },
      {
        questionText: "Selon les règles de la Norme, quel est le nombre maximum de variables locales que l'on peut déclarer dans une seule fonction C ?",
        answers: ["3", "4", "5", "6"],
        correctAnswer: "5",
        points: 100,
      },
      {
        questionText: "Quelle est la commande pour insérer automatiquement le header de 42 dans un fichier ouvert avec l'éditeur de texte Vim ?",
        answers: [":Stdheader", ":42header", ":Header", ":InsertHeader"],
        correctAnswer: ":Stdheader",
        points: 100,
      },
      {
        questionText: "Dans le système de nommage des hôtes (hostnames) de 42, à quoi correspond la lettre 'e' dans un identifiant de poste tel que 'e1r2p3' ?",
        answers: ["Emplacement", "Étage", "Écran", "Équipement"],
        correctAnswer: "Étage",
        points: 100,
      },
      {
        questionText: "Selon la Norme de 42, quel est le nombre maximum d'arguments (paramètres nommés) qu'une fonction C peut accepter ?",
        answers: ["3", "4", "5", "6"],
        correctAnswer: "4",
        points: 100,
      },
      {
        questionText: "Selon la Norme de 42, quelle est la limite de lignes maximale autorisée pour le corps d'une fonction C (hors accolades) ?",
        answers: ["20 lignes", "25 lignes", "30 lignes", "35 lignes"],
        correctAnswer: "25 lignes",
        points: 100,
      },
      {
        questionText: "Quel est le nom officiel du système d'évaluation automatique en arrière-plan qui attribue la note finale à vos projets du Common Core à l'école 42 ?",
        answers: ["Deepthought", "Norminette", "Bocal-Bot", "Moulinette-V2"],
        correctAnswer: "Deepthought",
        points: 100,
      },
      {
        questionText: "Quel est le niveau (level) maximum théorique qu'un étudiant peut atteindre dans le cursus de l'école 42 ?",
        answers: ["Niveau 15", "Niveau 18", "Niveau 21", "Niveau 42"],
        correctAnswer: "Niveau 21",
        points: 100,
      },
      {
        questionText: "Quel projet de la Piscine C de 42 demande de trouver le plus grand carré possible dans un plateau rempli d'obstacles ?",
        answers: ["BSQ", "Sastantua", "Rush 01", "Rush 02"],
        correctAnswer: "BSQ",
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
