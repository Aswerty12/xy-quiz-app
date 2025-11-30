import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UploadResponse , Quiz} from '../models/quiz.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizAdminService {
  
  private readonly API_URL = environment.apiUrl|| 'http://localhost:8000/api';

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
  getQuizzes(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.API_URL}/quizzes`);
  }

  deleteQuiz(quizId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/quiz/${quizId}`);
  }
}