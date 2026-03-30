import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from './sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from './topbar/admin-topbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [AdminSidebarComponent, AdminTopbarComponent, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  sidebarCollapsed = signal<boolean>(localStorage.getItem('adminSidebarCollapsed') === '1');

  toggleSidebar() {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem('adminSidebarCollapsed', next ? '1' : '0');
  }
}
