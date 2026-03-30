import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-client-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-footer.component.html',
})
export class ClientFooterComponent {
  currentYear = new Date().getFullYear();
}
