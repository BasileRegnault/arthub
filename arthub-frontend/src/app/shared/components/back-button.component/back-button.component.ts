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
  @Input() route: string | null = null;

  private router = inject(Router);

  goBack() {
    if (this.route) {
      this.router.navigate([this.route]);
    } else {
      history.back();
    }
  }
}
