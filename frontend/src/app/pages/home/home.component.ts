import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styles: [`
    @keyframes fade-in-down {
      0% { opacity: 0; transform: translateY(-20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-down {
      animation: fade-in-down 0.8s ease-out;
    }
  `]
})
export class HomeComponent { }