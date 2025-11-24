import { Component, signal,inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule],
  template: `
    <h1>Welcome to {{ title() }}!</h1>
    <h1>X vs Y Quiz</h1>
    <p>Backend Status: {{ status | json }}</p>
    <button (click)="checkBackend()">Check Connection</button>

    <router-outlet />
  `,
  styles: [],
})
export class App {
  http = inject(HttpClient);
  status: any = "Unknown";

  checkBackend() {
    // We ask Angular for /api/health, the Proxy forwards it to Python
    this.http.get('/api/health').subscribe(response => {
      this.status = response;
    });
  }
  protected readonly title = signal('frontend');
}
