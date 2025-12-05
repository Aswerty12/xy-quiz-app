import { SafeUrl } from '@angular/platform-browser';

export interface Quiz {
  id: string;
  name: string;
  label_x: string;
  label_y: string;
  total_images: number;
  created_at: string;
}

export interface RoundResult {
  imageUrl: string | SafeUrl;
  correctLabel: 'x' | 'y';
  userGuess: 'x' | 'y' | 'TIMEOUT';
  isCorrect: boolean;
}

// Internal Interface for the queue returned by backend /start endpoint
export interface GameRoundDefinition {
  imageUrl: string; // Relative path from backend
  label: 'x' | 'y';
}

export interface GameSession {
  quizId: string;
  currentRoundIndex: number;
  totalRounds: number;
  score: number;
  history: RoundResult[];
  activeImageBlobUrl: string | SafeUrl | null; // For the DOM
  currentRoundDefinition: GameRoundDefinition | null;
  status: 'IDLE' | 'LOADING' | 'PLAYING' | 'ROUND_END' | 'GAME_OVER';
  config: {
    useAntiCheat: boolean;
    bufferTimeMs: number;
    timerDuration: number; // 0 or null means disabled
  };
}