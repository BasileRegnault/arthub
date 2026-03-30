import { Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-back-button',
  imports: [CommonModule, RouterModule],
  templateUrl: './back-button.component.html',
  styleUrl: './back-button.component.scss',
})
export class BackButtonComponent {
  @Input() label: string = 'Retour';
  @Input() route: string = '/'; // route par défaut

  private router = inject(Router);

  goBack() {
    this.router.navigate([this.route]);
  }
}
