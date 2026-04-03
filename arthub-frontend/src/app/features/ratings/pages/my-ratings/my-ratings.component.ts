import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Rating } from '../../../../core/models';
import { environment } from '../../../../environments/environment';
import { StarRatingComponent } from '../../../../shared/components/star-rating.component/star-rating.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-my-ratings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StarRatingComponent
  ],
  templateUrl: './my-ratings.component.html',
})
export class MyRatingsComponent implements OnInit {
  private api = inject(ApiPlatformService<any>);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  ratings = signal<Rating[]>([]);
  loading = signal(false);
  currentUser = this.authService.currentUser;

  page = signal(1);
  totalPages = signal(1);
  itemsPerPage = 20;

  // Filtre
  filterStars = signal<number>(0); // 0 = tous
  sortBy = signal<'recent' | 'highRating' | 'lowRating'>('recent');

  filteredRatings = computed(() => {
    let filtered = [...this.ratings()];

    // Filtrer par étoiles
    if (this.filterStars() > 0) {
      filtered = filtered.filter(r => r.score === this.filterStars());
    }

    // Trier
    const sort = this.sortBy();
    if (sort === 'highRating') {
      filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sort === 'lowRating') {
      filtered.sort((a, b) => (a.score || 0) - (b.score || 0));
    } else {
      // récent - déjà trié depuis l'API
    }

    return filtered;
  });

  // Stats
  totalRatings = computed(() => this.ratings().length);
  averageRating = computed(() => {
    const allRatings = this.ratings();
    if (allRatings.length === 0) return 0;
    const sum = allRatings.reduce((acc, r) => acc + (r.score || 0), 0);
    return Math.round((sum / allRatings.length) * 10) / 10;
  });

  ngOnInit() {
    const userId = (this.currentUser as any)?.id;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadRatings(userId);
  }

  loadRatings(userId: number) {
    this.loading.set(true);

    this.api.list('ratings', 1, 100, {
      createdBy: `/api/users/${userId}`,
      'order[createdAt]': 'desc'
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.ratings.set(res.items || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.show('Erreur lors du chargement des notes', 'error');
        }
      });
  }

  deleteRating(ratingId: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return;

    this.api.delete('ratings', ratingId).subscribe({
      next: () => {
        // Supprimer de la liste
        this.ratings.set(this.ratings().filter(r => r.id !== ratingId));
      },
      error: () => {
        this.toast.show('Erreur lors de la suppression de la note', 'error');
      }
    });
  }

  getArtworkImageUrl(artwork: any): string {
    return artwork?.image?.contentUrl
      ? environment.apiBaseUrl + artwork.image.contentUrl
      : 'assets/default-image.svg';
  }

  getArtworkId(rating: Rating): number | null {
    const artwork = rating.artwork;
    if (!artwork) return null;

    if (typeof artwork === 'string') {
      const parts = artwork.split('/');
      return Number(parts[parts.length - 1]);
    }

    return (artwork as any).id || null;
  }

  getArtworkTitle(rating: Rating): string {
    const artwork = rating.artwork;
    if (!artwork) return 'Œuvre inconnue';

    if (typeof artwork === 'object') {
      return (artwork as any).title || 'Œuvre inconnue';
    }

    return 'Œuvre';
  }
}
