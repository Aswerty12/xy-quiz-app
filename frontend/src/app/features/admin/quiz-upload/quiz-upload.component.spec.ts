import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { QuizUploadComponent } from './quiz-upload.component';
import { QuizAdminService } from '../../../services/quiz-admin.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { HttpEventType, HttpEvent } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

// Mock data to be used across tests
const MOCK_QUIZZES = [
  { id: '1', name: 'Quiz A', label_x: 'X', label_y: 'Y', total_images: 10, created_at: '2023-01-01' },
  { id: '2', name: 'Quiz B', label_x: 'A', label_y: 'B', total_images: 20, created_at: '2023-01-02' }
];

describe('QuizUploadComponent', () => {
  let component: QuizUploadComponent;
  let fixture: ComponentFixture<QuizUploadComponent>;
  let mockAdminService: jasmine.SpyObj<QuizAdminService>;

  beforeEach(async () => {
    mockAdminService = jasmine.createSpyObj('QuizAdminService', [
      'uploadQuiz', 
      'getQuizzes', 
      'deleteQuiz'
    ]);

    mockAdminService.getQuizzes.and.returnValue(of(MOCK_QUIZZES));

    await TestBed.configureTestingModule({
      imports: [QuizUploadComponent, ReactiveFormsModule],
      providers: [
        { provide: QuizAdminService, useValue: mockAdminService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizUploadComponent);
    component = fixture.componentInstance;
    
    // Trigger ngOnInit and initial data binding
    fixture.detectChanges();
  });

  // --- EXISTING TESTS (Refined) ---

  it('should initialize and load quizzes', () => {
    expect(component.uploadForm.valid).toBeFalse();
    expect(component.fileX).toBeNull();
    
    expect(mockAdminService.getQuizzes).toHaveBeenCalled();
    expect(component.quizzes.length).toBe(2);
    expect(component.quizzes[0].name).toBe('Quiz A');
  });

  it('should validate file types on selection', () => {
    const badFile = new File([''], 'test.txt', { type: 'text/plain' });
    const goodFile = new File([''], 'test.zip', { type: 'application/zip' });

    component.onFileSelected(badFile, 'x');
    expect(component.errorMessage).toContain('valid ZIP');
    expect(component.fileX).toBeNull();

    component.onFileSelected(goodFile, 'x');
    expect(component.errorMessage).toBe('');
    expect(component.fileX).toEqual(goodFile);
  });

  it('should call service, update progress, and reload list on submit', fakeAsync(() => {
    component.uploadForm.setValue({ name: 'Integration Test', labelX: 'Cats', labelY: 'Dogs' });
    component.fileX = new File([''], 'x.zip', { type: 'application/zip' });
    component.fileY = new File([''], 'y.zip', { type: 'application/zip' });

    const progressEvents: HttpEvent<any>[] = [
      { type: HttpEventType.UploadProgress, loaded: 50, total: 100 } as any,
      { type: HttpEventType.Response, body: { success: true } } as any
    ];
    mockAdminService.uploadQuiz.and.returnValue(of(...progressEvents).pipe(delay(1)));

    mockAdminService.getQuizzes.calls.reset();
    mockAdminService.getQuizzes.and.returnValue(of([...MOCK_QUIZZES, { id: '3', name: 'New Quiz', label_x:'C', label_y:'D', total_images:5, created_at:'' }]));

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isUploading).toBeTrue();
    expect(component.uploadProgress).toBe(0);

    tick(1);
    fixture.detectChanges(); 

    expect(component.isUploading).toBeFalse();
    expect(component.successMessage).toContain('success');
    expect(component.fileX).toBeNull();
    
    expect(mockAdminService.getQuizzes).toHaveBeenCalled();
  }));

  it('should handle upload errors', () => {
    component.uploadForm.patchValue({ name: 'Error Test', labelX: 'A', labelY: 'B' });
    component.fileX = new File([''], 'a.zip', { type: 'application/zip' });
    component.fileY = new File([''], 'b.zip', { type: 'application/zip' });

    mockAdminService.uploadQuiz.and.returnValue(throwError(() => ({ 
      error: { detail: 'Corrupt Zip' } 
    })));

    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage).toContain('Corrupt Zip');
    expect(component.isUploading).toBeFalse();
  });

  // --- FIXED DELETE TESTS ---

  it('should NOT delete if user cancels confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    
    component.onDeleteQuiz('1');

    expect(mockAdminService.deleteQuiz).not.toHaveBeenCalled();
    expect(component.quizzes.length).toBe(2);
  });

  it('should delete quiz and update list on confirmation', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    
    mockAdminService.deleteQuiz.and.returnValue(of({ status: 'success' }));

    component.onDeleteQuiz('1');
    tick(); // Let the observable complete

    expect(mockAdminService.deleteQuiz).toHaveBeenCalledWith('1');
    expect(component.quizzes.length).toBe(1);
    expect(component.quizzes[0].id).toBe('2');
    expect(component.successMessage).toContain('deleted successfully');
  }));

  it('should handle delete errors gracefully', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    
    mockAdminService.deleteQuiz.and.returnValue(throwError(() => ({ 
      message: 'Server error' 
    })));

    component.onDeleteQuiz('1');
    tick(); // Let the error callback execute

    expect(component.errorMessage).toContain('Failed to delete');
    expect(component.quizzes.length).toBe(2);
  }));

  it('should handle empty list from API', () => {
    mockAdminService.getQuizzes.and.returnValue(of([]));
    
    component.loadQuizzes();
    
    expect(component.quizzes).toEqual([]);
    expect(component.isLoadingList).toBeFalse();
  });
});