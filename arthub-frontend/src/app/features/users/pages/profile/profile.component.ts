import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private api = inject(ApiPlatformService<any>);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Utiliser le signal directement pour la réactivité
  currentUser = computed(() => this.authService.user());
  userLoading = this.authService.userLoading;

  // Stats
  galleriesCount = signal(0);
  ratingsCount = signal(0);
  artworksCount = signal(0);

  activeTab = signal<'galleries' | 'ratings'>('galleries');

  profileImageUrl = computed(() => {
    const user = this.currentUser();
    return user?.username
      ? `https://ui-avatars.com/api/?name=${user.username}&size=200&background=random`
      : 'assets/default-avatar.png';
  });

  ngOnInit() {
    // Attendre que l'utilisateur soit chargé
    this.authService.loadCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          if (!user?.id) {
            this.router.navigate(['/auth/login']);
            return;
          }
          this.loadStats(user.id);
        },
        error: () => {
          this.router.navigate(['/auth/login']);
        }
      });
  }

  loadStats(userId: number) {
    // Charger le nombre de galeries
    this.api.list('galleries', 1, 1, {
      owner: `/api/users/${userId}`
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.galleriesCount.set(res.total || 0),
        error: () => {}
      });

    // Charger le nombre de notes
    this.api.list('ratings', 1, 1, {
      createdBy: `/api/users/${userId}`
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.ratingsCount.set(res.total || 0),
        error: () => {}
      });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
