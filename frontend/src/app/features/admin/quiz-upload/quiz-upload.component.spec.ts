import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizUploadComponent } from './quiz-upload.component';
import { QuizAdminService } from '../../../services/quiz-admin.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpEventType, HttpEvent } from '@angular/common/http';
import { By } from '@angular/platform-browser';

describe('QuizUploadComponent', () => {
  let component: QuizUploadComponent;
  let fixture: ComponentFixture<QuizUploadComponent>;
  let mockAdminService: jasmine.SpyObj<QuizAdminService>;

  beforeEach(async () => {
    // Create a mock service
    mockAdminService = jasmine.createSpyObj('QuizAdminService', ['uploadQuiz']);

    await TestBed.configureTestingModule({
      imports: [QuizUploadComponent, ReactiveFormsModule],
      providers: [
        { provide: QuizAdminService, useValue: mockAdminService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with invalid form', () => {
    expect(component.uploadForm.valid).toBeFalse();
    expect(component.fileX).toBeNull();
  });

  it('should validate file types on selection', () => {
    const badFile = new File([''], 'test.txt', { type: 'text/plain' });
    const goodFile = new File([''], 'test.zip', { type: 'application/zip' });

    // Test Bad File
    component.onFileSelected(badFile, 'x');
    expect(component.errorMessage).toContain('valid ZIP');
    expect(component.fileX).toBeNull();

    // Test Good File
    component.onFileSelected(goodFile, 'x');
    expect(component.errorMessage).toBe('');
    expect(component.fileX).toEqual(goodFile);
  });

  it('should call service and update progress on submit', () => {
    // 1. Setup Form Data
    component.uploadForm.setValue({
      name: 'Integration Test',
      labelX: 'Cats',
      labelY: 'Dogs'
    });
    component.fileX = new File([''], 'x.zip', { type: 'application/zip' });
    component.fileY = new File([''], 'y.zip', { type: 'application/zip' });

    // 2. Mock Service Response (Progress Stream)
    const progressEvents: HttpEvent<any>[] = [
      { type: HttpEventType.UploadProgress, loaded: 50, total: 100 } as any,
      { type: HttpEventType.Response, body: { success: true } } as any
    ];
    mockAdminService.uploadQuiz.and.returnValue(of(...progressEvents));

    // 3. Trigger Submit
    component.onSubmit();

    // 4. Verification
    expect(mockAdminService.uploadQuiz).toHaveBeenCalled();
    expect(component.isUploading).toBeTrue();
    
    // Simulate Observable emission
    fixture.detectChanges(); 
    
    // Progress should have hit 50% then finished
    // Since stream is synchronous in test, it ends at 100% / success
    expect(component.successMessage).toContain('success');
    expect(component.fileX).toBeNull(); // Should reset after success
  });

  it('should handle upload errors', () => {
    // Setup
    component.uploadForm.patchValue({ name: 'Error Test', labelX: 'A', labelY: 'B' });
    component.fileX = new File([''], 'a.zip');
    component.fileY = new File([''], 'b.zip');

    // Mock Error
    mockAdminService.uploadQuiz.and.returnValue(throwError(() => ({ 
      error: { detail: 'Corrupt Zip' } 
    })));

    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage).toContain('Corrupt Zip');
    expect(component.isUploading).toBeFalse();
  });
});