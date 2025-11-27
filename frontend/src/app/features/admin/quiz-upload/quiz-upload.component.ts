import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { finalize, tap } from 'rxjs/operators';
import { DragDropDirective } from '../../../shared/directives/drag-drop.directive';
import { QuizAdminService } from '../../../services/quiz-admin.service';

@Component({
  selector: 'app-quiz-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropDirective],
  template: `
    <div class="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">Create New Quiz</h2>

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
              class="relative h-48 flex flex-col items-center justify-center border-4 border-dashed rounded-lg transition-colors cursor-pointer bg-gray-50"
            >
              <div *ngIf="!fileX" class="text-center p-4">
                <p class="text-gray-500">Drag & Drop ZIP here</p>
                <p class="text-xs text-gray-400">or click to select</p>
              </div>
              <div *ngIf="fileX" class="text-center p-4">
                <p class="text-green-600 font-bold">File Selected:</p>
                <p class="text-sm text-gray-700 break-all">{{ fileX.name }}</p>
                <p class="text-xs text-gray-500">{{ (fileX.size / 1024 / 1024) | number:'1.1-2' }} MB</p>
              </div>
              <!-- Hidden Input fallback -->
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
              class="relative h-48 flex flex-col items-center justify-center border-4 border-dashed rounded-lg transition-colors cursor-pointer bg-gray-50"
            >
              <div *ngIf="!fileY" class="text-center p-4">
                <p class="text-gray-500">Drag & Drop ZIP here</p>
                <p class="text-xs text-gray-400">or click to select</p>
              </div>
              <div *ngIf="fileY" class="text-center p-4">
                <p class="text-green-600 font-bold">File Selected:</p>
                <p class="text-sm text-gray-700 break-all">{{ fileY.name }}</p>
                <p class="text-xs text-gray-500">{{ (fileY.size / 1024 / 1024) | number:'1.1-2' }} MB</p>
              </div>
              <!-- Hidden Input fallback -->
              <input type="file" (change)="onManualSelect($event, 'y')" accept=".zip" class="opacity-0 absolute w-full h-full cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div *ngIf="isUploading" class="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 mt-4">
          <div 
            class="bg-blue-600 h-4 rounded-full transition-all duration-300" 
            [style.width.%]="uploadProgress"
          ></div>
          <p class="text-center text-xs mt-1">{{ uploadProgress }}%</p>
        </div>

        <!-- Error / Success Messages -->
        <div *ngIf="errorMessage" class="p-4 bg-red-100 text-red-700 rounded">
          {{ errorMessage }}
        </div>
        <div *ngIf="successMessage" class="p-4 bg-green-100 text-green-700 rounded">
          {{ successMessage }}
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end pt-4">
          <button 
            type="submit" 
            [disabled]="uploadForm.invalid || !fileX || !fileY || isUploading"
            class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isUploading ? 'Uploading & Extracting...' : 'Create Quiz' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class QuizUploadComponent {
  uploadForm: FormGroup;
  fileX: File | null = null;
  fileY: File | null = null;
  
  isUploading = false;
  uploadProgress = 0;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private adminService: QuizAdminService
  ) {
    this.uploadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      labelX: ['', Validators.required],
      labelY: ['', Validators.required]
    });
  }

  onFileSelected(file: File, side: 'x' | 'y') {
    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      this.errorMessage = 'Please upload a valid ZIP file.';
      return;
    }
    
    if (side === 'x') this.fileX = file;
    else this.fileY = file;
    
    this.errorMessage = ''; // Clear errors on valid drop
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
            this.successMessage = 'Quiz created successfully! Ready to play.';
            this.resetForm();
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