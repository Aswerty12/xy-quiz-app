import { Component ,OnInit,ChangeDetectorRef} from '@angular/core';
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
  template: `
    <div class="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 mb-10">
      
      <!-- HEADER -->
      <h2 class="text-2xl font-bold text-gray-800 mb-6">Create New Quiz</h2>

      <!-- UPLOAD FORM -->
      <form [formGroup]="uploadForm" (ngSubmit)="onSubmit()" class="space-y-6">
        
        <!-- Metadata Inputs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Quiz Name</label>
            <input 
              type="text" 
              formControlName="name"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="e.g. Real vs AI"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Label X Name</label>
            <input 
              type="text" 
              formControlName="labelX"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="e.g. Real Photo"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Label Y Name</label>
            <input 
              type="text" 
              formControlName="labelY"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="e.g. AI Generated"
            />
          </div>
        </div>

        <!-- Drag and Drop Zones -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <!-- Zone X -->
          <div class="flex flex-col gap-2">
            <span class="font-semibold text-gray-600">
              Upload Images for "{{ uploadForm.get('labelX')?.value || 'Label X' }}" (Zip)
            </span>
            <div 
              appDragDrop 
              (fileDropped)="onFileSelected($event, 'x')"
              class="relative h-32 flex flex-col items-center justify-center border-4 border-dashed rounded-lg transition-colors cursor-pointer bg-gray-50"
            >
              <div *ngIf="!fileX" class="text-center p-2">
                <p class="text-gray-500 text-sm">Drag & Drop ZIP here</p>
              </div>
              <div *ngIf="fileX" class="text-center p-2">
                <p class="text-green-600 font-bold text-sm">Selected:</p>
                <p class="text-xs text-gray-700 break-all">{{ fileX.name }}</p>
              </div>
              <input type="file" (change)="onManualSelect($event, 'x')" accept=".zip" class="opacity-0 absolute w-full h-full cursor-pointer" />
            </div>
          </div>

          <!-- Zone Y -->
          <div class="flex flex-col gap-2">
            <span class="font-semibold text-gray-600">
              Upload Images for "{{ uploadForm.get('labelY')?.value || 'Label Y' }}" (Zip)
            </span>
            <div 
              appDragDrop 
              (fileDropped)="onFileSelected($event, 'y')"
              class="relative h-32 flex flex-col items-center justify-center border-4 border-dashed rounded-lg transition-colors cursor-pointer bg-gray-50"
            >
              <div *ngIf="!fileY" class="text-center p-2">
                <p class="text-gray-500 text-sm">Drag & Drop ZIP here</p>
              </div>
              <div *ngIf="fileY" class="text-center p-2">
                <p class="text-green-600 font-bold text-sm">Selected:</p>
                <p class="text-xs text-gray-700 break-all">{{ fileY.name }}</p>
              </div>
              <input type="file" (change)="onManualSelect($event, 'y')" accept=".zip" class="opacity-0 absolute w-full h-full cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div *ngIf="isUploading" class="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 mt-4">
          <div class="bg-blue-600 h-4 rounded-full transition-all duration-300" [style.width.%]="uploadProgress"></div>
        </div>

        <!-- Messages -->
        <div *ngIf="errorMessage" class="p-3 bg-red-100 text-red-700 rounded text-sm">{{ errorMessage }}</div>
        <div *ngIf="successMessage" class="p-3 bg-green-100 text-green-700 rounded text-sm">{{ successMessage }}</div>

        <!-- Upload Button -->
        <div class="flex justify-end pt-4">
          <button 
            type="submit" 
            [disabled]="uploadForm.invalid || !fileX || !fileY || isUploading"
            class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ isUploading ? 'Uploading...' : 'Create Quiz' }}
          </button>
        </div>
      </form>

      <!-- MANAGE QUIZZES SECTION -->
      <hr class="my-8 border-gray-200">
      
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-gray-800">Manage Existing Quizzes</h3>
        
        <div *ngIf="isLoadingList" class="text-gray-500 text-sm">Loading quizzes...</div>
        <div *ngIf="!isLoadingList && quizzes.length === 0" class="text-gray-400 italic text-sm">No quizzes found.</div>

        <div *ngFor="let quiz of quizzes" class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <h4 class="font-bold text-gray-800">{{ quiz.name }}</h4>
            <p class="text-xs text-gray-500">
              {{ quiz.total_images }} images • {{ quiz.created_at | date:'shortDate' }}
            </p>
            <p class="text-xs text-gray-400">
              Labels: {{ quiz.label_x }} / {{ quiz.label_y }}
            </p>
          </div>
          <button 
            (click)="onDeleteQuiz(quiz.id)"
            [disabled]="deletingQuizId === quiz.id"
            class="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 rounded text-sm font-medium transition-colors"
          >
            {{ deletingQuizId === quiz.id ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>

    </div>
  `
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

  this.adminService.deleteQuiz(id).subscribe({
    next: () => {
      this.quizzes = this.quizzes.filter(q => q.id !== id);
      this.successMessage = 'Quiz deleted successfully.';
      this.deletingQuizId = null;
    },
    error: (err) => {
      console.error(err);
      this.errorMessage = 'Failed to delete quiz: ' + (err.error?.detail || err.message);
      this.deletingQuizId = null;
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