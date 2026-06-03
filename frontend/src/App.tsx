import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import {
  FriendsPage,
  GamePage,
  HomePage,
  LeaderboardPage,
  LobbyPage,
  LoginPage,
  NotFound,
  PrivacyPolicyPage,
  ProfilePage,
  QuizAdminPage,
  RegisterPage,
  ResultsPage,
  RoomPage,
  TermsOfServicePage,
} from "./pages";

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate cursor position relative to screen center
      const x = (e.clientX / window.innerWidth - 0.5) * 15;
      const y = (e.clientY / window.innerHeight - 0.5) * 15;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* 3D Holographic Grid Background Layer */}
      <div
        className="cyber-grid"
        style={{
          transform: `perspective(500px) rotateX(65deg) translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
        }}
      />
      {/* Periodic Screen Glitch Overlay */}
      <div className="cyber-glitch-overlay" />

      <Navbar />
      <div className="relative z-10 flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/room/:id" element={<RoomPage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/admin" element={<QuizAdminPage />} />
          <Route path="/admin/:id" element={<QuizAdminPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/politique-confidentialite"
            element={<PrivacyPolicyPage />}
          />
          <Route
            path="/conditions-utilisation"
            element={<TermsOfServicePage />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
