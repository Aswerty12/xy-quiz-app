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
  templateUrl: './game-container.component.html'
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