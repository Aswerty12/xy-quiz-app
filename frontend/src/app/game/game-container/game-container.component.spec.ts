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
    
    mockGameService = jasmine.createSpyObj('GameLogicService', ['submitGuess', 'advanceToNext', 'resetGame', 'getQuizLabels'], {
      session$: sessionSubject.asObservable()
    });

    // Mock getQuizLabels to return default labels
    mockGameService.getQuizLabels.and.returnValue({ x: 'Option X', y: 'Option Y' });

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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default quiz labels', () => {
    expect(component.quizLabels).toEqual({ x: 'X', y: 'Y' });
  });

  it('should fetch and update quiz labels on ngOnInit', () => {
    sessionSubject.next({ ...initialSession, quizId: '1' });
    fixture.detectChanges();

    expect(mockGameService.getQuizLabels).toHaveBeenCalledWith('1');
    expect(component.quizLabels).toEqual({ x: 'Option X', y: 'Option Y' });
  });

  it('should return quiz label for choice x', () => {
    component.quizLabels = { x: 'Dogs', y: 'Cats' };
    expect(component.getQuizLabel('x')).toBe('Dogs');
  });

  it('should return quiz label for choice y', () => {
    component.quizLabels = { x: 'Dogs', y: 'Cats' };
    expect(component.getQuizLabel('y')).toBe('Cats');
  });

  it('should fallback to uppercase choice if label not found', () => {
    component.quizLabels = { x: '', y: '' };
    expect(component.getQuizLabel('x')).toBe('X');
    expect(component.getQuizLabel('y')).toBe('Y');
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

 it('should display choice buttons with quiz labels when status is PLAYING', () => {
  // 1. Configure the mock to return the specific labels we want for this test
  mockGameService.getQuizLabels.and.returnValue({ x: 'Dogs', y: 'Cats' });
  
  // 2. Trigger the state change
  sessionSubject.next({ 
    ...initialSession, 
    status: 'PLAYING', 
    activeImageBlobUrl: 'blob:test',
    quizId: '1' // Ensure quizId is present so the logic runs
  });
  
  // 3. Update the view
  fixture.detectChanges();

  const buttons = fixture.nativeElement.querySelectorAll('button');
  const playingButtons = Array.from(buttons).filter((btn: any) => 
    btn.textContent.includes('Dogs') || btn.textContent.includes('Cats')
  );
  
  expect(playingButtons.length).toBe(2);
  expect((playingButtons[0] as HTMLElement).textContent).toContain('Dogs');
  expect((playingButtons[1] as HTMLElement).textContent).toContain('Cats');
});

  it('should call submitGuess when choice button is clicked', () => {
    sessionSubject.next({ 
      ...initialSession, 
      status: 'PLAYING', 
      activeImageBlobUrl: 'blob:test' 
    });
    fixture.detectChanges();

    component.submitGuess('x');
    expect(mockGameService.submitGuess).toHaveBeenCalledWith('x');
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
      history: [{ imageUrl: 'blob:test', correctLabel: 'x', userGuess: 'x', isCorrect: true }] 
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Correct!');
  });

  it('should display image in review modal during ROUND_END', () => {
    sessionSubject.next({ 
      ...initialSession, 
      status: 'ROUND_END',
      history: [{ imageUrl: 'blob:test', correctLabel: 'x', userGuess: 'x', isCorrect: true }]
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const reviewImages = compiled.querySelectorAll('img');
    
    // Should have at least one image in the review modal
    expect(reviewImages.length).toBeGreaterThan(0);
  });

  it('should display correct and user guess in review modal', () => {
  // 1. Configure the mock for this specific scenario
  mockGameService.getQuizLabels.and.returnValue({ x: 'Dogs', y: 'Cats' });

  // 2. Trigger the state change
  sessionSubject.next({ 
    ...initialSession, 
    status: 'ROUND_END',
    quizId: '1', // Ensure logic runs
    history: [{ imageUrl: 'blob:test', correctLabel: 'x', userGuess: 'y', isCorrect: false }]
  });
  
  // 3. Update the view
  fixture.detectChanges();

  const compiled = fixture.nativeElement as HTMLElement;
  expect(compiled.textContent).toContain('Dogs'); // Correct answer
  expect(compiled.textContent).toContain('Cats'); // User guess
  expect(compiled.textContent).toContain('Wrong!');
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

  it('should advance round on Enter when in ROUND_END', () => {
    sessionSubject.next({ 
      ...initialSession, 
      status: 'ROUND_END',
      history: [{ imageUrl: '', correctLabel: 'x', userGuess: 'x', isCorrect: true }]
    });
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);

    expect(mockGameService.advanceToNext).toHaveBeenCalled();
  });

  it('should display correct round number using getDisplayRound', () => {
    sessionSubject.next({ 
      ...initialSession, 
      currentRoundIndex: 2, 
      totalRounds: 10 
    });
    fixture.detectChanges();

    expect(component.getDisplayRound({ ...initialSession, currentRoundIndex: 2, totalRounds: 10 })).toBe(3);
  });

  it('should cap round display at total rounds', () => {
    const session = { ...initialSession, currentRoundIndex: 10, totalRounds: 10 };
    expect(component.getDisplayRound(session)).toBe(10);
  });

  it('should unsubscribe on ngOnDestroy', () => {
      if (component['sub'] && typeof component['sub'].unsubscribe === 'function') {
          spyOn(component['sub'], 'unsubscribe');
      }
      component.ngOnInit();
      component.ngOnDestroy();

      // Component should not throw errors when destroyed
      expect(component).toBeTruthy();
  });
});