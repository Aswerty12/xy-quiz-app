import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UploadResponse } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class QuizAdminService {
  // Assuming standard FastAPI default port, configure as needed
  private readonly API_URL = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  /**
   * Uploads the quiz definition and zips.
   * Returns an Observable of HttpEvents to track progress.
   */
  uploadQuiz(
    name: string,
    labelX: string,
    labelY: string,
    fileX: File,
    fileY: File
  ): Observable<HttpEvent<UploadResponse>> {
    const formData: FormData = new FormData();

    formData.append('name', name);
    formData.append('label_x', labelX);
    formData.append('label_y', labelY);
    // Backend expects specific field names for the files
    formData.append('file_x', fileX);
    formData.append('file_y', fileY);

    const req = new HttpRequest('POST', `${this.API_URL}/upload`, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request(req);
  }
}