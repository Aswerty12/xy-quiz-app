import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GameLogicService } from './game-logic.service';
import { GameRoundDefinition, Quiz } from '../models/game.models';

describe('GameLogicService', () => {
  let service: GameLogicService;
  let httpMock: HttpTestingController;

  const mockQuiz: Quiz = {
    id: 'test-quiz', name: 'Test Quiz', label_x: 'Real', label_y: 'AI',
    total_images: 10, created_at: '2023-01-01'
  };

  const mockRoundQueue: GameRoundDefinition[] = [
    { imageUrl: 'img1.jpg', label: 'x' },
    { imageUrl: 'img2.jpg', label: 'y' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GameLogicService]
    });
    service = TestBed.inject(GameLogicService);
    httpMock = TestBed.inject(HttpTestingController);

    // Mock global URL APIs used in the service
    spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/mock-url');
    spyOn(URL, 'revokeObjectURL').and.stub();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created with initial state', () => {
    expect(service).toBeTruthy();
    service.session$.subscribe(state => {
      expect(state.status).toBe('IDLE');
      expect(state.score).toBe(0);
    });
  });

  it('should fetch quizzes', () => {
    service.fetchQuizzes();
    const req = httpMock.expectOne('http://localhost:8000/api/quizzes');
    expect(req.request.method).toBe('GET');
    req.flush([mockQuiz]);

    service.quizzes$.subscribe(quizzes => {
      expect(quizzes.length).toBe(1);
      expect(quizzes[0].id).toBe('test-quiz');
    });
  });

  describe('Game Flow & Anti-Cheat', () => {

    // Helper to start a game for subsequent tests
    const startGameHelper = () => {
      service.startGame('test-quiz', 5);
      const req = httpMock.expectOne('http://localhost:8000/api/quiz/test-quiz/start?limit=5');
      req.flush(mockRoundQueue);
    };

    it('should initialize game state on startGame', () => {
      startGameHelper();

      // Note: startGame triggers loadNextRound immediately, so we expect an image request
      const imgReq = httpMock.expectOne('http://localhost:8000/img1.jpg');
      imgReq.flush(new Blob());

      service.session$.subscribe(state => {
        expect(state.quizId).toBe('test-quiz');
        expect(state.totalRounds).toBe(2);
      });
    });

    it('should wait for buffer time (Anti-Cheat) before showing image', fakeAsync(() => {
      startGameHelper();

      const imgReq = httpMock.expectOne('http://localhost:8000/img1.jpg');

      // 1. Flush the image immediately (simulate fast network)
      imgReq.flush(new Blob());

      // 2. Check State: Should still be LOADING because timer(1000) hasn't finished
      expect(service['sessionSubject'].value.status).toBe('LOADING');
      expect(service['sessionSubject'].value.activeImageBlobUrl).toBeNull();

      // 3. Fast forward 500ms
      tick(500);
      expect(service['sessionSubject'].value.status).toBe('LOADING');

      // 4. Fast forward past 1000ms total
      tick(500);
      expect(service['sessionSubject'].value.status).toBe('PLAYING');
      expect(service['sessionSubject'].value.activeImageBlobUrl).toBeTruthy();
    }));

    it('should update score correctly on correct guess', fakeAsync(() => {
      // Setup Game and load round 1 (Label is 'x')
      startGameHelper();
      const imgReq = httpMock.expectOne('http://localhost:8000/img1.jpg');
      imgReq.flush(new Blob());
      tick(1000);

      // Act
      service.submitGuess('x');

      // Assert
      const state = service['sessionSubject'].value;
      expect(state.score).toBe(1);
      expect(state.history.length).toBe(1);
      expect(state.history[0].isCorrect).toBeTrue();
      expect(state.status).toBe('ROUND_END');
    }));

    it('should NOT update score on incorrect guess', fakeAsync(() => {
      // Setup Game and load round 1 (Label is 'x')
      startGameHelper();
      const imgReq = httpMock.expectOne('http://localhost:8000/img1.jpg');
      imgReq.flush(new Blob());
      tick(1000);

      // Act
      service.submitGuess('y');

      // Assert
      const state = service['sessionSubject'].value;
      expect(state.score).toBe(0);
      expect(state.history[0].isCorrect).toBeFalse();
    }));

    it('should handle TIMEOUT guess correctly', fakeAsync(() => {
      // Setup Game and load round 1 (Label is 'x')
      startGameHelper();
      const imgReq = httpMock.expectOne('http://localhost:8000/img1.jpg');
      imgReq.flush(new Blob());
      tick(1000);

      // Act
      service.submitGuess('TIMEOUT');

      // Assert
      const state = service['sessionSubject'].value;
      expect(state.score).toBe(0);
      expect(state.history[0].isCorrect).toBeFalse();
      expect(state.history[0].userGuess).toBe('TIMEOUT');
    }));

    it('should advance to next round', fakeAsync(() => {
      // Setup
      startGameHelper();
      httpMock.expectOne('http://localhost:8000/img1.jpg').flush(new Blob());
      tick(1000);

      service.submitGuess('x'); // Round 1 done

      // Act
      service.advanceToNext();

      // Assert
      const state = service['sessionSubject'].value;
      expect(state.currentRoundIndex).toBe(1);
      expect(state.status).toBe('LOADING');

      // Should request second image
      const imgReq2 = httpMock.expectOne('http://localhost:8000/img2.jpg');
      imgReq2.flush(new Blob());
      tick(1000);

      expect(service['sessionSubject'].value.status).toBe('PLAYING');
    }));

    it('should set status to GAME_OVER when rounds are finished', fakeAsync(() => {
      // Setup to be at the last round
      startGameHelper();
      httpMock.expectOne('http://localhost:8000/img1.jpg').flush(new Blob());
      tick(1000); // Playing Round 1
      service.submitGuess('x');
      service.advanceToNext();

      httpMock.expectOne('http://localhost:8000/img2.jpg').flush(new Blob());
      tick(1000); // Playing Round 2
      service.submitGuess('y');

      // Act: Advance after last round
      service.advanceToNext();

      // Assert
      expect(service['sessionSubject'].value.status).toBe('GAME_OVER');
    }));
  });
});