import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CyberPanel } from "../components/cyber";
import { getSocket } from "../services/socket";
import { useAuthSession } from "../hooks/useAuthSession";
import { Room } from "../services/rooms";

type QuestionPayload = {
  id: number;
  questionText: string;
  answers: string[];
  position: number;
  durationSec: number;
  totalQuestions: number;
};

type QuestionResultPayload = {
  correctAnswer: string;
  results: { userId: number; correct: boolean; points: number }[];
  scores: { userId: number; score: number }[];
};

export default function GamePage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionResultPayload | null>(null);
  const [scores, setScores] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();

    const onRoomStateUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === "FINISHED") {
        setTimeout(() => navigate(`/room/${roomId}`), 3000); // Back to room instead of non-existent /results
      }
    };

    const onQuestion = (data: QuestionPayload) => {
      setQuestion(data);
      setTimeLeft(data.durationSec);
      setSelectedAnswer(null);
      setResult(null);
    };

    const onQuestionResult = (data: QuestionResultPayload) => {
      setResult(data);
      setScores((prevScores) => {
        const newScores = new Map(prevScores);
        data.scores.forEach((s) => newScores.set(s.userId, s.score));
        return newScores;
      });
    };

    const onGameEnded = () => {
      setTimeout(() => navigate(`/room/${roomId}`), 3000);
    };

    socket.on("room_state_updated", onRoomStateUpdated);
    socket.on("question", onQuestion);
    socket.on("question_result", onQuestionResult);
    socket.on("game_ended", onGameEnded);
    
    // Join room just in case they reloaded page
    if (socket.connected) {
      socket.emit("join_room", { roomId });
    } else {
      socket.on("connect", () => socket.emit("join_room", { roomId }));
    }

    return () => {
      socket.off("room_state_updated", onRoomStateUpdated);
      socket.off("question", onQuestion);
      socket.off("question_result", onQuestionResult);
      socket.off("game_ended", onGameEnded);
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, result]);

  const handleSelectAnswer = (answer: string) => {
    if (selectedAnswer || result || timeLeft === 0) return;
    
    setSelectedAnswer(answer);
    const socket = getSocket();
    socket.emit("submit_answer", { roomId, answer });
  };

  const getUsername = (userId: number) => {
    const player = room?.players?.find(p => p.userId === userId);
    return player?.user?.username || `Joueur ${userId}`;
  };

  if (!room) {
    return <div className="p-10 text-center text-text">Chargement de la partie...</div>;
  }

  return (
    <main className="flex flex-1 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Game Area */}
          <div className="flex-1 flex flex-col gap-6">
            <CyberPanel className="rounded-4xl p-8 md:p-10 relative overflow-hidden flex flex-col min-h-[500px]">
              
              {!question && !result && room.status === "PLAYING" && (
                <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
                  <h2 className="text-3xl text-secondary font-bold">Préparez-vous...</h2>
                  <p className="text-text-muted mt-4">La première question arrive !</p>
                </div>
              )}

              {room.status === "FINISHED" && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <h2 className="text-4xl text-primary font-bold mb-4">Partie terminée !</h2>
                  <p className="text-xl text-text">Retour au salon en cours...</p>
                </div>
              )}

              {question && room.status === "PLAYING" && (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-text-muted bg-background/50 px-4 py-2 rounded-full border border-border/30">
                      Question {question.position} / {question.totalQuestions}
                    </span>
                    <span className={`text-2xl font-bold px-4 py-2 rounded-full border ${
                      timeLeft !== null && timeLeft <= 5 ? 'text-red-400 border-red-500/50 bg-red-900/20 animate-pulse' : 'text-secondary border-secondary/30 bg-secondary/10'
                    }`}>
                      {timeLeft}s
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl text-text font-bold text-center mb-10 flex-1 flex items-center justify-center">
                    {question.questionText}
                  </h2>

                  {result && (
                    <div className="mb-6 p-4 rounded-xl text-center font-bold text-lg border bg-background/80 flex flex-col gap-2">
                      <span className="text-text">Temps écoulé !</span>
                      <span className="text-primary">La bonne réponse était : {result.correctAnswer}</span>
                      
                      {user && (
                        <span>
                          {result.results.find(r => r.userId === user.id)?.correct 
                            ? <span className="text-green-400">+ {result.results.find(r => r.userId === user.id)?.points} points !</span>
                            : <span className="text-red-400">Aïe, mauvaise réponse...</span>
                          }
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.answers.map((ans, idx) => {
                      let btnClass = "p-4 text-lg font-bold rounded-xl border transition-all ";
                      
                      if (result) {
                        if (ans === result.correctAnswer) {
                          btnClass += "bg-green-500/20 border-green-500 text-green-300";
                        } else if (ans === selectedAnswer) {
                          btnClass += "bg-red-500/20 border-red-500 text-red-300";
                        } else {
                          btnClass += "bg-background/50 border-border/30 text-text-muted opacity-50";
                        }
                      } else {
                        if (ans === selectedAnswer) {
                          btnClass += "bg-primary/20 border-primary text-primary";
                        } else {
                          btnClass += "bg-background/80 border-border/50 text-text hover:bg-background hover:border-secondary cursor-pointer";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(ans)}
                          disabled={!!result || !!selectedAnswer || timeLeft === 0}
                          className={btnClass}
                        >
                          {ans}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CyberPanel>
          </div>

          {/* Sidebar / Leaderboard */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <CyberPanel className="rounded-4xl p-6 h-full border border-border/30 bg-background/50">
              <h3 className="text-xl font-bold text-text mb-6 pb-2 border-b border-border/50">Classement</h3>
              <div className="flex flex-col gap-4">
                {room.players
                  ?.map(p => ({
                    ...p,
                    currentScore: scores.get(p.userId) ?? p.score ?? 0
                  }))
                  .sort((a, b) => b.currentScore - a.currentScore)
                  .map((player, idx) => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-background/80 rounded-xl border border-border/20">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 
                          idx === 1 ? 'bg-gray-300/20 text-gray-300 border border-gray-400/50' :
                          idx === 2 ? 'bg-orange-600/20 text-orange-500 border border-orange-600/50' :
                          'bg-secondary/10 text-secondary border border-secondary/20'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="font-bold text-text truncate max-w-[100px]" title={getUsername(player.userId)}>
                          {getUsername(player.userId)}
                        </span>
                      </div>
                      <span className="font-bold text-primary">
                        {player.currentScore}
                      </span>
                    </div>
                  ))
                }
              </div>
            </CyberPanel>
          </div>

        </div>
      </div>
    </main>
  );
}
