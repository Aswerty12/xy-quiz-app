import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QuizAdminService } from './quiz-admin.service';
import { HttpEventType } from '@angular/common/http';

describe('QuizAdminService', () => {
  let service: QuizAdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [QuizAdminService]
    });
    service = TestBed.inject(QuizAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verifies no pending requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should construct FormData and send POST request to /api/upload', () => {
    // Mock Data
    const fileX = new File(['dummy content'], 'x.zip', { type: 'application/zip' });
    const fileY = new File(['dummy content'], 'y.zip', { type: 'application/zip' });
    const mockResponse = { success: true, quiz_id: '123', message: 'Upload complete' };

    // Trigger API Call
    service.uploadQuiz('Test Quiz', 'Real', 'AI', fileX, fileY).subscribe(event => {
      if (event.type === HttpEventType.Response) {
        expect(event.body).toEqual(mockResponse);
      }
    });

    // Expect Request
    const req = httpMock.expectOne('http://localhost:8000/api/upload');
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBeTrue();

    // Verify FormData integrity
    const body = req.request.body as FormData;
    expect(body.has('name')).toBeTrue();
    expect(body.get('name')).toBe('Test Quiz');
    expect(body.get('file_x')).toEqual(fileX);
    expect(body.get('file_y')).toEqual(fileY);

    // Flush Response
    req.flush(mockResponse);
  });
});