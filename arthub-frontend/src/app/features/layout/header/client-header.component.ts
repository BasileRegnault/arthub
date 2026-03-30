import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-client-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './client-header.component.html',
})
export class ClientHeaderComponent {
  scrolled = input<boolean>(false);
  private authService = inject(AuthService);
  private router = inject(Router);

  mobileMenuOpen = signal(false);
  userMenuOpen = signal(false);
  contributeMenuOpen = signal(false);

  isAuthenticated = () => this.authService.isAuthenticated();
  currentUser = this.authService.currentUser;

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  toggleUserMenu() {
    this.contributeMenuOpen.set(false);
    this.userMenuOpen.update(v => !v);
  }

  toggleContributeMenu() {
    this.userMenuOpen.set(false);
    this.contributeMenuOpen.update(v => !v);
  }

  logout() {
    this.authService.logout();
    this.userMenuOpen.set(false);
    this.router.navigate(['/auth/login']);
  }

  closeMenus() {
    this.mobileMenuOpen.set(false);
    this.userMenuOpen.set(false);
    this.contributeMenuOpen.set(false);
  }
}
