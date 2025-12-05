import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameLogicService } from '../../services/game-logic.service';
import { GameSession } from '../../models/game.models';
import { Observable, Subscription, timer, of } from 'rxjs';
import { skip, switchMap, map, takeWhile } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4" *ngIf="session$ | async as session">
      
      <!-- Top HUD -->
      <div class="w-full max-w-4xl flex justify-between items-center text-white mb-4 px-4">
        <div class="text-xl font-mono">Round: {{ getDisplayRound(session) }} / {{ session.totalRounds }}</div>
        <div class="flex items-center gap-4">
          <div *ngIf="timerDisplay$ | async as timeLeft" class="text-2xl font-bold text-yellow-400 font-mono">
            {{ timeLeft }}s
          </div>
          <div class="text-3xl font-bold text-indigo-400">{{ session.score }} pts</div>
        </div>
      </div>

      <!-- Main Game Area -->
      <div class="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800">
        
        <!-- Loading State (Anti-Cheat Spinner) -->
        <div *ngIf="session.status === 'LOADING'" 
             class="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gray-900">
          <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
          <p class="mt-4 text-indigo-300 animate-pulse">Loading secure asset...</p>
        </div>

        <!-- The Image -->
        <img *ngIf="session.activeImageBlobUrl && session.status !== 'LOADING'"
             [src]="session.activeImageBlobUrl" 
             class="w-full h-full object-contain"
             alt="Guess now">

        <!-- Choice Buttons Overlay (Playing State) -->
        <div *ngIf="session.status === 'PLAYING'" 
             class="absolute inset-0 flex items-end justify-center z-10 pb-8">
          <div class="flex gap-6">
            <button (click)="submitGuess('x')" 
                    class="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg">
              {{ getQuizLabel('x') }} (←)
            </button>
            <button (click)="submitGuess('y')" 
                    class="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg">
              {{ getQuizLabel('y') }} (→)
            </button>
          </div>
        </div>

        <!-- Round End / Review Modal -->
        <div *ngIf="session.status === 'ROUND_END'" 
             class="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6">
          
          <div class="bg-gray-800 rounded-xl p-8 max-w-2xl w-full">
            <div class="flex flex-col md:flex-row gap-6">
              <!-- Image Review Section -->
              <div class="flex-1 flex flex-col items-center">
                <h3 class="text-lg text-gray-300 mb-3 font-semibold">Review Image</h3>
                <img [src]="getLastResult(session).imageUrl" 
                     class="w-full rounded-lg object-contain max-h-64 border-2 border-gray-700"
                     alt="Review">
              </div>
              
              <!-- Result Section -->
              <div class="flex-1 flex flex-col justify-center text-center">
                <div class="text-5xl mb-4">
                  {{ getLastResult(session).isCorrect ? '✅' : '❌' }}
                </div>
                
                <h2 class="text-2xl text-white font-bold mb-4">
                  {{ getLastResult(session).isCorrect ? 'Correct!' : (getLastResult(session).userGuess === 'TIMEOUT' ? "Time's Up!" : 'Wrong!') }}
                </h2>
                
                <div class="space-y-3 mb-6">
                  <p class="text-gray-300">
                    Your guess: <span class="font-bold text-white">{{ getQuizLabel(getLastResult(session).userGuess) }}</span>
                  </p>
                  <p class="text-gray-300">
                    Correct answer: <span class="font-bold text-white">{{ getQuizLabel(getLastResult(session).correctLabel) }}</span>
                  </p>
                </div>

                <button (click)="nextRound()" 
                        class="w-full bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors">
                  Next Round (Space)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Game Over Overlay -->
        <div *ngIf="session.status === 'GAME_OVER'" 
             class="absolute inset-0 bg-indigo-900 z-40 flex flex-col items-center justify-center">
          <h1 class="text-5xl text-white font-bold mb-4">Game Over</h1>
          <p class="text-2xl text-indigo-200 mb-8">Final Score: {{ session.score }} / {{ session.totalRounds }}</p>
          <button (click)="quitGame()" class="border border-white text-white px-6 py-2 rounded hover:bg-white/10">
            Back to Menu
          </button>
        </div>
      </div>

      
    </div>
  `
})
export class GameContainerComponent implements OnInit, OnDestroy {
  session$: Observable<GameSession>;
  timerDisplay$: Observable<number | null>;
  private sub: Subscription | null = null;
  private currentStatus: string = 'IDLE';
  quizLabels: { x: string; y: string } = { x: 'X', y: 'Y' };

  constructor(
    private gameService: GameLogicService,
    private router: Router
  ) {
    this.session$ = this.gameService.session$;

    this.timerDisplay$ = this.session$.pipe(
      switchMap(session => {
        if (session.status === 'PLAYING' && session.config.timerDuration > 0) {
          return timer(0, 1000).pipe(
            map(tick => session.config.timerDuration - tick),
            takeWhile(val => val >= 0)
          );
        } else {
          return of(null);
        }
      })
    );
  }

  ngOnInit() {
    // Ignore the initial session emission (TestBed provides the initial BehaviorSubject value)
    // so the component retains its default labels until a subsequent emission triggers a fetch.
    this.sub = this.session$.pipe(skip(1)).subscribe(s => {
      this.currentStatus = s.status;
      // Update quiz labels from game service when they become available
      if (s.quizId) {
        const labels = this.gameService.getQuizLabels(s.quizId);
        if (labels) {
          this.quizLabels = labels;
        }
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.currentStatus === 'PLAYING') {
      if (event.key === 'ArrowLeft') this.submitGuess('x');
      if (event.key === 'ArrowRight') this.submitGuess('y');
    } else if (this.currentStatus === 'ROUND_END') {
      if (event.code === 'Space' || event.key === 'Enter') this.nextRound();
    }
  }

  getDisplayRound(session: GameSession): number {
    return Math.min(session.currentRoundIndex + 1, session.totalRounds);
  }

  submitGuess(guess: 'x' | 'y') {
    this.gameService.submitGuess(guess);
  }

  nextRound() {
    this.gameService.advanceToNext();
  }

  quitGame() {
    // 1. Clean up the service state (revoke blobs, reset score/round)
    this.gameService.resetGame();

    // 2. Navigate back to the dashboard 
    this.router.navigate(['/select']).catch(err => console.error('Failed to navigate away from game:', err));
  }

  getLastResult(session: GameSession) {
    return session.history[session.history.length - 1];
  }

  getQuizLabel(choice: 'x' | 'y' | 'TIMEOUT'): string {
    if (choice === 'TIMEOUT') return 'TIMEOUT';
    // Support both shapes: { x: 'Label' } and { label_x: 'Label' }
    const maybeKey = (this.quizLabels as any)[choice];
    const maybeLabelKey = (this.quizLabels as any)[`label_${choice}`];
    return maybeKey || maybeLabelKey || choice.toUpperCase();
  }
}