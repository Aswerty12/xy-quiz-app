import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, timer, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { GameSession, Quiz, GameRoundDefinition } from '../models/game.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameLogicService {
  private apiUrl = environment.apiUrl;

  // --- State Management ---
  private initialState: GameSession = {
    quizId: '',
    currentRoundIndex: 0,
    totalRounds: 0,
    score: 0,
    history: [],
    activeImageBlobUrl: null,
    currentRoundDefinition: null,
    status: 'IDLE',
    config: { useAntiCheat: true, bufferTimeMs: 1000 }
  };

  private sessionSubject = new BehaviorSubject<GameSession>(this.initialState);
  public session$ = this.sessionSubject.asObservable();

  private quizzesSubject = new BehaviorSubject<Quiz[]>([]);
  public quizzes$ = this.quizzesSubject.asObservable();

  // Queue of rounds to be played
  private roundQueue: GameRoundDefinition[] = [];

  constructor(private http: HttpClient) {}

  // --- API Methods ---

  fetchQuizzes(): void {
    this.http.get<Quiz[]>(`${this.apiUrl}/quizzes`).subscribe({
      next: (data) => this.quizzesSubject.next(data),
      error: (err) => console.error('Failed to fetch quizzes', err)
    });
  }

  /**
   * Initializes a game.
   * 1. Fetches the randomized list from the backend.
   * 2. Sets up the local queue.
   * 3. Starts the first round.
   */
  startGame(quizId: string, totalRoundsWanted: number): void {
    this.http.get<GameRoundDefinition[]>(`${this.apiUrl}/quiz/${quizId}/start?limit=${totalRoundsWanted}`)
      .subscribe({
        next: (queue) => {
          this.roundQueue = queue;
          this.updateState({
            quizId,
            totalRounds: queue.length,
            currentRoundIndex: 0,
            score: 0,
            history: [],
            status: 'IDLE'
          });
          // Immediately trigger first round load
          this.loadNextRound();
        },
        error: (err) => console.error('Failed to start game', err)
      });
  }

  // --- The Anti-Cheat Logic ---

  loadNextRound(): void {
    const currentState = this.sessionSubject.value;

    // Check for Game Over
    if (currentState.currentRoundIndex >= currentState.totalRounds) {
      this.updateState({ status: 'GAME_OVER' });
      return;
    }

    const nextRoundDef = this.roundQueue[currentState.currentRoundIndex];
    
    // Set status to LOADING to show spinner
    this.updateState({ 
      status: 'LOADING', 
      currentRoundDefinition: nextRoundDef,
      activeImageBlobUrl: null // Clear previous image
    });

    // Construct full URL (Assuming backend serves static files)
    // Note: Adjust localhost port if different
    const fullImageUrl = `http://localhost:8000/${nextRoundDef.imageUrl}`;

    // RxJS Anti-Cheat Flow
    const imageRequest$ = this.http.get(fullImageUrl, { responseType: 'blob' });
    const bufferTimer$ = timer(currentState.config.bufferTimeMs); // Force min delay

    forkJoin([imageRequest$, bufferTimer$]).pipe(
      map(([blob, _]) => {
        // Create local object URL for instant rendering
        return URL.createObjectURL(blob);
      }),
      catchError(err => {
        console.error('Image load failed', err);
        return of(null);
      })
    ).subscribe((blobUrl) => {
      if (blobUrl) {
        this.updateState({
          status: 'PLAYING',
          activeImageBlobUrl: blobUrl
        });
      }
    });
  }

  // --- Game Logic ---

  submitGuess(userGuess: 'x' | 'y'): void {
    const state = this.sessionSubject.value;
    if (state.status !== 'PLAYING' || !state.currentRoundDefinition) return;

    const isCorrect = userGuess === state.currentRoundDefinition.label;

    const result = {
      imageUrl: state.activeImageBlobUrl || '',
      correctLabel: state.currentRoundDefinition.label,
      userGuess: userGuess,
      isCorrect: isCorrect
    };

    this.updateState({
      score: isCorrect ? state.score + 1 : state.score,
      history: [...state.history, result],
      status: 'ROUND_END' // Triggers the review modal/overlay
    });
  }

  advanceToNext(): void {
    const state = this.sessionSubject.value;
    // Revoke old object URL to prevent memory leaks
    if (state.activeImageBlobUrl) {
      URL.revokeObjectURL(state.activeImageBlobUrl);
    }

    this.updateState({
      currentRoundIndex: state.currentRoundIndex + 1
    });
    
    this.loadNextRound();
  }

  resetGame(): void {
    this.updateState(this.initialState);
  }

  // Helper to emit new state non-destructively
  private updateState(changes: Partial<GameSession>): void {
    this.sessionSubject.next({ ...this.sessionSubject.value, ...changes });
  }
}