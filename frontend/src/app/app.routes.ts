// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { QuizUploadComponent } from './features/admin/quiz-upload/quiz-upload.component';
import { DashboardComponent } from './game/dashboard/dashboard.component';
import { GameContainerComponent } from './game/game-container/game-container.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'admin', component: QuizUploadComponent },
  { path: 'select', component: DashboardComponent },
  { path: 'play', component: GameContainerComponent },
  // Fallback
  { path: '**', redirectTo: '' }
];