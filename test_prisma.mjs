import { PrismaClient } from './backend/generated/prisma/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const quiz = await prisma.quiz.findFirst({
    orderBy: { id: 'desc' }
  });
  console.log("Last quiz:", quiz);
}
main().catch(console.error).finally(() => prisma.$disconnect());
