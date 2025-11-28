import { Component, signal,inject ,OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient,HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
// Import your actual components
import { QuizUploadComponent } from './features/admin/quiz-upload/quiz-upload.component';
import { DashboardComponent } from './game/dashboard/dashboard.component';
import { GameContainerComponent } from './game/game-container/game-container.component';

// Import the service to monitor state
import { GameLogicService } from './services/game-logic.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule,
    HttpClientModule, // Required for API calls
    QuizUploadComponent,
    DashboardComponent,
    GameContainerComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-100 font-sans text-gray-800">
      
      <!-- TOP NAVIGATION BAR -->
      <nav class="bg-white shadow-md p-4 sticky top-0 z-50">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🧪</span>
            <h1 class="text-xl font-bold text-gray-800">Dev Harness</h1>
          </div>
          
          <div class="flex gap-4">
            <!-- Mode Toggles -->
            <button 
              (click)="switchMode('admin')"
              [class]="viewMode === 'admin' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              class="px-4 py-2 rounded-lg font-medium transition-all">
              Admin Upload
            </button>
            
            <button 
              (click)="switchMode('game')"
              [class]="viewMode === 'game' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              class="px-4 py-2 rounded-lg font-medium transition-all">
              Play Game
            </button>
          </div>
        </div>
      </nav>

      <!-- MAIN CONTENT AREA -->
      <main class="container mx-auto p-4">
        
        <!-- SCENARIO 1: ADMIN MODE -->
        <ng-container *ngIf="viewMode === 'admin'">
          <app-quiz-upload></app-quiz-upload>
        </ng-container>

        <!-- SCENARIO 2: GAME MODE -->
        <ng-container *ngIf="viewMode === 'game'">
          
          <!-- Case A: No active game -> Show Dashboard -->
          <ng-container *ngIf="!isGameActive">
            <app-dashboard></app-dashboard>
          </ng-container>

          <!-- Case B: Game in progress -> Show Game Container -->
          <ng-container *ngIf="isGameActive">
            <div class="relative">
              <!-- Optional: 'Force Quit' button for testing purposes since we don't have a full router yet -->
              <button 
                (click)="forceReset()" 
                class="absolute top-4 left-4 z-50 bg-red-500/80 text-white text-xs px-2 py-1 rounded hover:bg-red-600">
                ⚠️ Force Reset
              </button>
              
              <app-game-container></app-game-container>
            </div>
          </ng-container>

        </ng-container>

      </main>
    </div>
  `,
  styles: [],
})
export class AppComponent implements OnInit {
  viewMode: 'admin' | 'game' = 'admin';
  isGameActive = false;

  constructor(private gameService: GameLogicService) {}

  ngOnInit() {
    // Listen to the Game State. 
    // If status is anything other than 'IDLE', we know the user clicked "Start" in the Dashboard.
    this.gameService.session$.subscribe(session => {
      this.isGameActive = session.status !== 'IDLE';
    });
  }

  switchMode(mode: 'admin' | 'game') {
    this.viewMode = mode;
  }

  forceReset() {
    // Helper to escape the game loop during testing if needed
    window.location.reload();
  }
}
