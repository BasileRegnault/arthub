import { CommonModule, Location } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './admin-topbar.component.html',
  styleUrl: './admin-topbar.component.scss',
})
export class AdminTopbarComponent {
  auth = inject(AuthService);
  breadcrumbService = inject(BreadcrumbService);
  private router = inject(Router);
  private location = inject(Location);

  collapsed = input(false);
  toggleSidebar = output<void>();

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/admin']);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
