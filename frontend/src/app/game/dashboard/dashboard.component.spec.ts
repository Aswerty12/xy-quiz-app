import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { GameLogicService } from '../../services/game-logic.service';
import { of } from 'rxjs';
import { Quiz } from '../../models/game.models';
import { FormsModule } from '@angular/forms';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockGameService: jasmine.SpyObj<GameLogicService>;

  const mockQuizzes: Quiz[] = [
    { id: '1', name: 'Quiz A', label_x: 'X', label_y: 'Y', total_images: 20, created_at: '' },
    { id: '2', name: 'Quiz B', label_x: 'A', label_y: 'B', total_images: 10, created_at: '' }
  ];

  beforeEach(async () => {
    mockGameService = jasmine.createSpyObj('GameLogicService', ['fetchQuizzes', 'startGame'], {
      quizzes$: of(mockQuizzes)
    });

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, FormsModule], // Standalone component import
      providers: [
        { provide: GameLogicService, useValue: mockGameService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch quizzes on init', () => {
    expect(mockGameService.fetchQuizzes).toHaveBeenCalled();
  });

  it('should render quiz cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.shadow-lg'); // Based on tailwind class in template
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Quiz A');
  });

  it('should call startGame with correct parameters when button clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const startButtons = compiled.querySelectorAll('button');

    // Simulate user selecting 15 rounds for Quiz A (id: '1')
    component.selectedRounds['1'] = 15;

    // Click first button
    startButtons[0].click();

    expect(mockGameService.startGame).toHaveBeenCalledWith('1', 15, 0);
  });
});