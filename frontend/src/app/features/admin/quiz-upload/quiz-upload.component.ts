import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { finalize, tap } from 'rxjs/operators';
import { DragDropDirective } from '../../../shared/directives/drag-drop.directive';
import { Quiz } from '../../../models/quiz.model';
import { QuizAdminService } from '../../../services/quiz-admin.service';

@Component({
  selector: 'app-quiz-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropDirective],
  templateUrl: './quiz-upload.component.html'
})
export class QuizUploadComponent implements OnInit {
  uploadForm: FormGroup;
  fileX: File | null = null;
  fileY: File | null = null;

  isUploading = false;
  uploadProgress = 0;
  errorMessage = '';
  successMessage = '';

  // New properties for list management
  quizzes: Quiz[] = [];
  isLoadingList = false;

  //For deleting quizzes
  deletingQuizId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private adminService: QuizAdminService,
    private cd: ChangeDetectorRef
  ) {
    this.uploadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      labelX: ['', Validators.required],
      labelY: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadQuizzes();
  }

  loadQuizzes() {
    this.isLoadingList = true;
    this.adminService.getQuizzes()
      .pipe(
        finalize(() => this.isLoadingList = false)
      )
      .subscribe({
        next: (data) => {
          this.quizzes = Array.isArray(data) ? data : [];
          console.log('Quizzes loaded:', this.quizzes);
        },
        error: (err) => {
          console.error('Failed to load quizzes', err);
          this.errorMessage = 'Could not load quiz list.';
        }
      });
  }

  onDeleteQuiz(id: string) {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.deletingQuizId = id;

    this.adminService.deleteQuiz(id).pipe(
      finalize(() => this.deletingQuizId = null)
    ).subscribe({
      next: () => {
        this.quizzes = this.quizzes.filter(q => q.id !== id);
        this.successMessage = 'Quiz deleted successfully.';
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to delete quiz: ' + (err.error?.detail || err.message);
      }
    });
  }

  onFileSelected(file: File, side: 'x' | 'y') {
    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      this.errorMessage = 'Please upload a valid ZIP file.';
      return;
    }

    if (side === 'x') this.fileX = file;
    else this.fileY = file;

    this.errorMessage = '';
  }

  onManualSelect(event: any, side: 'x' | 'y') {
    const file = event.target.files[0];
    if (file) {
      this.onFileSelected(file, side);
    }
  }

  onSubmit() {
    if (this.uploadForm.invalid || !this.fileX || !this.fileY) return;

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.successMessage = '';

    const { name, labelX, labelY } = this.uploadForm.value;

    this.adminService.uploadQuiz(name, labelX, labelY, this.fileX, this.fileY)
      .pipe(
        finalize(() => this.isUploading = false)
      )
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress = Math.round(100 * (event.loaded / event.total));
          } else if (event.type === HttpEventType.Response) {
            this.successMessage = 'Quiz created successfully!';
            this.resetForm();
            this.loadQuizzes(); // Refresh list after upload
          }
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'Upload failed. ' + (err.error?.detail || err.message);
        }
      });
  }

  private resetForm() {
    this.uploadForm.reset();
    this.fileX = null;
    this.fileY = null;
    this.uploadProgress = 0;
  }
}