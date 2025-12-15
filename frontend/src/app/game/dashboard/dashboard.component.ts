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
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  quizzes$: Observable<Quiz[]>;
  selectedRounds: { [key: string]: number } = {};
  selectedTimer: { [key: string]: number } = {};

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
          if (this.selectedTimer[quiz.id] === undefined) {
            this.selectedTimer[quiz.id] = 0; // Default to disabled
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

  getTimerForQuiz(quiz: Quiz): number {
    return this.selectedTimer[quiz.id] ?? 0;
  }

  onStartQuiz(quiz: Quiz): void {
    const rounds = this.getRoundsForQuiz(quiz); // Reuses same logic
    const timer = this.getTimerForQuiz(quiz);
    this.gameService.startGame(quiz.id, rounds, timer);
    this.router.navigate(['/play']).catch(err => console.error('Failed to navigate into game', err));
  }
}