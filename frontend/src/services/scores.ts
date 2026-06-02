import { apiRequest } from "./api";

export type QuizLeaderboardEntry = {
  userId: number;
  username: string;
  score: number;
  wins: number;
  gamesPlayed: number;
};

export type WinsLeaderboardEntry = {
  userId: number;
  username: string;
  totalWins: number;
};

export type UserWinsRank = {
  userId: number;
  totalWins: number;
  gamesPlayed: number;
  rank: number;
};

export function getQuizLeaderboard(
  quizId: number,
  limit = 10,
): Promise<QuizLeaderboardEntry[]> {
  return apiRequest<QuizLeaderboardEntry[]>(
    `/scores/quizzes/${quizId}/leaderboard?limit=${limit}`,
  );
}

export function getWinsLeaderboard(
  limit = 10,
): Promise<WinsLeaderboardEntry[]> {
  return apiRequest<WinsLeaderboardEntry[]>(
    `/scores/leaderboard/wins?limit=${limit}`,
  );
}

export function getUserWinsRank(userId: number): Promise<UserWinsRank> {
  return apiRequest<UserWinsRank>(`/scores/users/${userId}/wins-rank`);
}
