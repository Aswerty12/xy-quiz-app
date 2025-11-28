import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule,RouterLink,RouterLinkActive],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      
      <!-- Global Navigation -->
      <nav class="bg-gray-900 text-white shadow-lg z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Logo -->
            <div class="flex items-center">
              <a routerLink="/" class="text-xl font-bold font-mono tracking-wider hover:text-indigo-400 transition-colors">
                X<span class="text-indigo-500">|</span>Y
              </a>
            </div>
            
            <!-- Links -->
            <div class="flex space-x-4">
              <a routerLink="/select" 
                 routerLinkActive="bg-gray-700 text-white" 
                [routerLinkActiveOptions]="{exact: true}" 
                 class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-all">
                 Play
              </a>
              <a routerLink="/admin" 
                 routerLinkActive="bg-gray-700 text-white" 
                 class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-all">
                 Admin
              </a>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="flex-grow relative">
        <router-outlet></router-outlet>
      </main>

    </div>
  `
})
export class AppComponent {
  title = 'x-or-y-quizmaker';
}