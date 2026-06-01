-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "quizId" INTEGER;

-- AlterTable
ALTER TABLE "RoomPlayer" ADD COLUMN     "isConnected" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;
