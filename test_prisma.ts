import { PrismaClient } from './backend/generated/prisma/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const quiz = await prisma.quiz.create({
    data: {
      title: "Test Quiz",
      questionDurationSec: null,
    }
  });
  console.log(quiz);
}
main().catch(console.error).finally(() => prisma.$disconnect());
