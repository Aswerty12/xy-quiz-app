import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameLogicService } from '../../services/game-logic.service';
import { GameSession } from '../../models/game.models';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-game-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4" *ngIf="session$ | async as session">
      
      <!-- Top HUD -->
      <div class="w-full max-w-4xl flex justify-between items-center text-white mb-4 px-4">
        <div class="text-xl font-mono">Round: {{ getDisplayRound(session) }} / {{ session.totalRounds }}</div>
        <div class="text-3xl font-bold text-indigo-400">{{ session.score }} pts</div>
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

        <!-- Round End / Review Overlay -->
        <div *ngIf="session.status === 'ROUND_END'" 
             class="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
          
          <div class="text-6xl mb-4">
            {{ getLastResult(session).isCorrect ? '✅' : '❌' }}
          </div>
          
          <h2 class="text-3xl text-white font-bold mb-2">
            {{ getLastResult(session).isCorrect ? 'Correct!' : 'Wrong!' }}
          </h2>
          
          <p class="text-gray-300 mb-8">
            It was <span class="font-bold text-white">{{ getLastResult(session).correctLabel | uppercase }}</span>
          </p>

          <button (click)="nextRound()" 
                  class="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors auto-focus">
            Next Round (Space)
          </button>
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

      <!-- Controls Hint -->
      <div class="mt-8 flex gap-8 text-gray-400" *ngIf="session.status === 'PLAYING'">
        <div class="flex flex-col items-center">
          <kbd class="px-4 py-2 bg-gray-800 rounded-lg border-b-4 border-gray-700 text-xl font-bold">←</kbd>
          <span class="text-sm mt-2">Guess X</span>
        </div>
        <div class="flex flex-col items-center">
          <kbd class="px-4 py-2 bg-gray-800 rounded-lg border-b-4 border-gray-700 text-xl font-bold">→</kbd>
          <span class="text-sm mt-2">Guess Y</span>
        </div>
      </div>
    </div>
  `
})
export class GameContainerComponent implements OnInit, OnDestroy {
  session$: Observable<GameSession>;
  private sub: Subscription | null = null;
  private currentStatus: string = 'IDLE';

  constructor(private gameService: GameLogicService) {
    this.session$ = this.gameService.session$;
  }

  ngOnInit() {
    this.sub = this.session$.subscribe(s => this.currentStatus = s.status);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.currentStatus === 'PLAYING') {
      if (event.key === 'ArrowLeft') this.gameService.submitGuess('x');
      if (event.key === 'ArrowRight') this.gameService.submitGuess('y');
    } else if (this.currentStatus === 'ROUND_END') {
      if (event.code === 'Space' || event.key === 'Enter') this.nextRound();
    }
  }

  getDisplayRound(session: GameSession): number {
    return Math.min(session.currentRoundIndex + 1, session.totalRounds);
  }

  nextRound() {
    this.gameService.advanceToNext();
  }

  quitGame() {
    // Navigate back to dashboard logic here
    window.location.reload(); // Simple reset for now
  }

  getLastResult(session: GameSession) {
    return session.history[session.history.length - 1];
  }
}