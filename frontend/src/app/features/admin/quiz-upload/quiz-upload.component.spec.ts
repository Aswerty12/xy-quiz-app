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
    // 1. Create spy object with ALL used methods, including the new ones
    mockAdminService = jasmine.createSpyObj('QuizAdminService', [
      'uploadQuiz', 
      'getQuizzes', 
      'deleteQuiz'
    ]);

    // 2. IMPORTANT: Setup default return for getQuizzes because ngOnInit calls it immediately.
    // If we don't do this, ngOnInit might fail or return undefined.
    mockAdminService.getQuizzes.and.returnValue(of(MOCK_QUIZZES));

    await TestBed.configureTestingModule({
      imports: [QuizUploadComponent, ReactiveFormsModule],
      providers: [
        { provide: QuizAdminService, useValue: mockAdminService },
        // ChangeDetectorRef is provided automatically by ComponentFixture, 
        // but explicit providing is harmless if needed for specific mocking.
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizUploadComponent);
    component = fixture.componentInstance;
    
    // 3. Trigger ngOnInit (which calls loadQuizzes)
    fixture.detectChanges(); 
  });

  // --- EXISTING TESTS (Refined) ---

  it('should initialize and load quizzes', () => {
    expect(component.uploadForm.valid).toBeFalse();
    expect(component.fileX).toBeNull();
    
    // Check if quizzes were loaded on init
    expect(mockAdminService.getQuizzes).toHaveBeenCalled();
    expect(component.quizzes.length).toBe(2);
    expect(component.quizzes[0].name).toBe('Quiz A');
  });

  it('should validate file types on selection', () => {
    const badFile = new File([''], 'test.txt', { type: 'text/plain' });
    const goodFile = new File([''], 'test.zip', { type: 'application/zip' });

    component.onFileSelected(badFile, 'x');
    expect(component.errorMessage).toContain('valid ZIP');

    component.onFileSelected(goodFile, 'x');
    expect(component.errorMessage).toBe('');
    expect(component.fileX).toEqual(goodFile);
  });

  it('should call service, update progress, and reload list on submit', fakeAsync(() => {
    // Setup valid form
    component.uploadForm.setValue({ name: 'Integration Test', labelX: 'Cats', labelY: 'Dogs' });
    component.fileX = new File([''], 'x.zip', { type: 'application/zip' });
    component.fileY = new File([''], 'y.zip', { type: 'application/zip' });

    // Mock Upload with Delay
    const progressEvents: HttpEvent<any>[] = [
      { type: HttpEventType.UploadProgress, loaded: 50, total: 100 } as any,
      { type: HttpEventType.Response, body: { success: true } } as any
    ];
    mockAdminService.uploadQuiz.and.returnValue(of(...progressEvents).pipe(delay(1)));

    // Reset calls to getQuizzes to ensure we check if it's called AGAIN after upload
    mockAdminService.getQuizzes.calls.reset();
    mockAdminService.getQuizzes.and.returnValue(of([...MOCK_QUIZZES, { id: '3', name: 'New Quiz', label_x:'C', label_y:'D', total_images:5, created_at:'' }]));

    component.onSubmit();
    fixture.detectChanges(); // Update UI for isUploading=true

    expect(component.isUploading).toBeTrue();
    expect(component.uploadProgress).toBe(0);

    tick(1); // Finish upload
    fixture.detectChanges(); 

    expect(component.isUploading).toBeFalse();
    expect(component.successMessage).toContain('success');
    expect(component.fileX).toBeNull();
    
    // VERIFY: Does it refresh the quiz list after upload?
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

  // --- NEW TESTS FOR DELETE FUNCTIONALITY ---

  it('should NOT delete if user cancels confirmation', () => {
    // Mock window.confirm to return false
    spyOn(window, 'confirm').and.returnValue(false);
    
    component.onDeleteQuiz('1');

    expect(mockAdminService.deleteQuiz).not.toHaveBeenCalled();
    // List should remain unchanged
    expect(component.quizzes.length).toBe(2);
  });

  it('should delete quiz and update list on confirmation', () => {
    // 1. Mock window.confirm to return true
    spyOn(window, 'confirm').and.returnValue(true);
    
    // 2. Mock delete success
    mockAdminService.deleteQuiz.and.returnValue(of({ status: 'success' }));

    // 3. Perform delete on ID '1' (Quiz A)
    component.onDeleteQuiz('1');
    fixture.detectChanges();

    // 4. Verify Service Call
    expect(mockAdminService.deleteQuiz).toHaveBeenCalledWith('1');

    // 5. Verify Local Update (Quiz A should be gone, Quiz B remains)
    expect(component.quizzes.length).toBe(1);
    expect(component.quizzes[0].id).toBe('2');
    
    // 6. Verify Success Message
    expect(component.successMessage).toContain('deleted successfully');
  });

  it('should handle delete errors gracefully', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    
    // Mock Error
    mockAdminService.deleteQuiz.and.returnValue(throwError(() => ({ 
      message: 'Server error' 
    })));

    component.onDeleteQuiz('1');
    fixture.detectChanges();

    // Verify Error Message
    expect(component.errorMessage).toContain('Failed to delete');
    
    // Verify List was NOT updated (optimistic updates might differ, 
    // but based on your code, filter happens in next(), so list should stay same on error)
    expect(component.quizzes.length).toBe(2);
  });

  it('should handle empty list from API', () => {
    // Simulate empty list response
    mockAdminService.getQuizzes.and.returnValue(of([]));
    
    component.loadQuizzes();
    
    expect(component.quizzes).toEqual([]);
    expect(component.isLoadingList).toBeFalse();
  });
});