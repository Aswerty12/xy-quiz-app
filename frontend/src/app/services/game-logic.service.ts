import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, timer, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { GameSession, Quiz, GameRoundDefinition } from '../models/game.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameLogicService {
  private apiUrl = environment.apiUrl; 
  private baseUrl = environment.baseUrl; 

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

  private roundQueue: GameRoundDefinition[] = [];
  private objectUrlsToRevoke: string[] = [];

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

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
    
    this.updateState({ 
      status: 'LOADING', 
      currentRoundDefinition: nextRoundDef,
      activeImageBlobUrl: null 
    });

    // Fix: Remove leading slash if present to avoid double slashes
    const imagePath = nextRoundDef.imageUrl.startsWith('/') 
      ? nextRoundDef.imageUrl.slice(1) 
      : nextRoundDef.imageUrl;
    const fullImageUrl = `${this.baseUrl}/${imagePath}`;

    const imageRequest$ = this.http.get(fullImageUrl, { responseType: 'blob' });
    const bufferTimer$ = timer(currentState.config.bufferTimeMs);

    forkJoin([imageRequest$, bufferTimer$]).pipe(
      map(([blob, _]) => {
        // Create Object URL from blob
        const objectUrl = URL.createObjectURL(blob);
        // Track it for cleanup
        this.objectUrlsToRevoke.push(objectUrl);
        // Return the string URL directly (not wrapped in SafeUrl)
        return objectUrl;
      }),
      catchError(err => {
        console.error('Image load failed:', err);
        return of(null);
      })
    ).subscribe((objectUrl) => {
      if (objectUrl) {
        // Store the string URL directly - Angular will handle it in the template
        this.updateState({
          status: 'PLAYING',
          activeImageBlobUrl: objectUrl as any // Store string URL directly
        });
      } else {
        console.warn('Skipping broken round due to load failure.');
        this.advanceToNext(); 
      }
    });
  }

  submitGuess(userGuess: 'x' | 'y'): void {
    const state = this.sessionSubject.value;
    if (state.status !== 'PLAYING' || !state.currentRoundDefinition) return;

    const isCorrect = userGuess === state.currentRoundDefinition.label;

    const result = {
      imageUrl: '', 
      correctLabel: state.currentRoundDefinition.label,
      userGuess: userGuess,
      isCorrect: isCorrect
    };

    this.updateState({
      score: isCorrect ? state.score + 1 : state.score,
      history: [...state.history, result],
      status: 'ROUND_END'
    });
  }

  advanceToNext(): void {
    const state = this.sessionSubject.value;
    
    // Revoke the previous object URL to free memory
    if (state.activeImageBlobUrl && typeof state.activeImageBlobUrl === 'string') {
      URL.revokeObjectURL(state.activeImageBlobUrl);
    }
    
    this.updateState({
      currentRoundIndex: state.currentRoundIndex + 1,
      activeImageBlobUrl: null
    });
    
    this.loadNextRound();
  }

  resetGame(): void {
    // Clean up all object URLs
    this.objectUrlsToRevoke.forEach(url => URL.revokeObjectURL(url));
    this.objectUrlsToRevoke = [];
    this.updateState(this.initialState);
  }

  private updateState(changes: Partial<GameSession>): void {
    this.sessionSubject.next({ ...this.sessionSubject.value, ...changes });
  }
}