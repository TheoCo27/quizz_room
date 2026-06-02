import { PrismaClient } from './generated/prisma/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      _count: {
        select: {
          matchHistoryEntries: {
            where: {
              isWinner: true,
            },
          },
        },
      },
    },
  });

  const leaderboard = users.map((user) => ({
    userId: user.id,
    username: user.username,
    totalWins: user._count.matchHistoryEntries,
  }));

  leaderboard.sort((a, b) => {
    if (b.totalWins !== a.totalWins) {
      return b.totalWins - a.totalWins;
    }
    return a.username.localeCompare(b.username);
  });

  console.log("Leaderboard inside backend container:", leaderboard);
}
main().catch(console.error).finally(() => prisma.$disconnect());
