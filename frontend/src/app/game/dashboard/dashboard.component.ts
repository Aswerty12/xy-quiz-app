import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { GameLogicService } from '../../services/game-logic.service';
import { Quiz } from '../../models/game.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-8 text-gray-800">Select a Quiz</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let quiz of quizzes$ | async" 
             class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
          
          <h2 class="text-xl font-bold text-indigo-600 mb-2">{{ quiz.name }}</h2>
          <div class="flex justify-between text-sm text-gray-500 mb-4">
            <span>X: {{ quiz.label_x }}</span>
            <span>Y: {{ quiz.label_y }}</span>
          </div>
          <p class="text-xs text-gray-400 mb-6">Total Images: {{ quiz.total_images }}</p>

          <!-- Round Selector -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Rounds: {{ getRoundsForQuiz(quiz) }}
            </label>
            <input 
              type="range" 
              min="1" 
              [max]="quiz.total_images"
              [(ngModel)]="selectedRounds[quiz.id]"
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
          </div>

          <button (click)="onStartQuiz(quiz)"
                  class="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
            Start Game
          </button>
        </div>
      </div>

      <div *ngIf="(quizzes$ | async)?.length === 0" class="text-center text-gray-500 mt-10">
        No quizzes found. Go to Admin to upload one.
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  quizzes$: Observable<Quiz[]>;
  selectedRounds: { [key: string]: number } = {};

  constructor(
    private gameService: GameLogicService,
    private router: Router
  ) {
    this.quizzes$ = this.gameService.quizzes$.pipe(
      tap(quizzes => {
        quizzes.forEach(quiz => {
          if (!this.selectedRounds[quiz.id]) {
            this.selectedRounds[quiz.id] = Math.max(1, Math.floor(quiz.total_images / 2));
          }
        });
      })
    );
  }

  ngOnInit(): void {
    this.gameService.fetchQuizzes();
  }

  // This ensures the number is ALWAYS shown, even before user interaction
  getRoundsForQuiz(quiz: Quiz): number {
    // The selectedRounds for this quiz should now be initialized when quizzes$ emits.
    // This method now acts as a pure getter.
    return this.selectedRounds[quiz.id] || 1;
  }

  onStartQuiz(quiz: Quiz): void {
    const rounds = this.getRoundsForQuiz(quiz); // Reuses same logic
    this.gameService.startGame(quiz.id, rounds);
    this.router.navigate(['/play']);
  }
}