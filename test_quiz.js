fetch("http://localhost:3000/quizzes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Test Unlimited",
    questionDurationSec: null,
    questions: [
      {
        questionText: "What is 2+2?",
        answers: ["1", "2", "3", "4"],
        correctAnswerIndex: 3,
        points: 10
      }
    ]
  })
}).then(res => res.json()).then(console.log).catch(console.error);
