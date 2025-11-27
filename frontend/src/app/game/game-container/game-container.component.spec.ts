import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameContainerComponent } from './game-container.component';
import { GameLogicService } from '../../services/game-logic.service';
import { BehaviorSubject } from 'rxjs';
import { GameSession } from '../../models/game.models';

describe('GameContainerComponent', () => {
  let component: GameContainerComponent;
  let fixture: ComponentFixture<GameContainerComponent>;
  let mockGameService: jasmine.SpyObj<GameLogicService>;
  let sessionSubject: BehaviorSubject<GameSession>;

  const initialSession: GameSession = {
    quizId: '1',
    currentRoundIndex: 0,
    totalRounds: 10,
    score: 0,
    history: [],
    activeImageBlobUrl: null,
    currentRoundDefinition: { imageUrl: 'test.jpg', label: 'x' },
    status: 'IDLE',
    config: { useAntiCheat: true, bufferTimeMs: 1000 }
  };

  beforeEach(async () => {
    sessionSubject = new BehaviorSubject<GameSession>(initialSession);
    
    mockGameService = jasmine.createSpyObj('GameLogicService', ['submitGuess', 'advanceToNext', 'resetGame'], {
      session$: sessionSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [GameContainerComponent],
      providers: [
        { provide: GameLogicService, useValue: mockGameService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show loading spinner when status is LOADING', () => {
    sessionSubject.next({ ...initialSession, status: 'LOADING' });
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    // Check for "Loading secure asset..." text or spinner class
    expect(compiled.textContent).toContain('Loading secure asset');
    expect(compiled.querySelector('img')).toBeNull();
  });

  it('should show image when status is PLAYING', () => {
    sessionSubject.next({ 
      ...initialSession, 
      status: 'PLAYING', 
      activeImageBlobUrl: 'blob:test' 
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.src).toContain('blob:test');
  });

  it('should handle ArrowLeft keydown as Guess X', () => {
    sessionSubject.next({ ...initialSession, status: 'PLAYING' });
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    window.dispatchEvent(event);

    expect(mockGameService.submitGuess).toHaveBeenCalledWith('x');
  });

  it('should handle ArrowRight keydown as Guess Y', () => {
    sessionSubject.next({ ...initialSession, status: 'PLAYING' });
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(event);

    expect(mockGameService.submitGuess).toHaveBeenCalledWith('y');
  });

  it('should NOT handle keyboard input if status is LOADING', () => {
    sessionSubject.next({ ...initialSession, status: 'LOADING' });
    fixture.detectChanges();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(mockGameService.submitGuess).not.toHaveBeenCalled();
  });

  it('should show Result Overlay when status is ROUND_END', () => {
    sessionSubject.next({ 
      ...initialSession, 
      status: 'ROUND_END',
      history: [{ imageUrl: '', correctLabel: 'x', userGuess: 'x', isCorrect: true }] 
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Correct!');
  });

  it('should advance round on Spacebar when in ROUND_END', () => {
    sessionSubject.next({ 
      ...initialSession, 
      status: 'ROUND_END',
      history: [{ imageUrl: '', correctLabel: 'x', userGuess: 'x', isCorrect: true }]
    });
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { code: 'Space' });
    window.dispatchEvent(event);

    expect(mockGameService.advanceToNext).toHaveBeenCalled();
  });
});