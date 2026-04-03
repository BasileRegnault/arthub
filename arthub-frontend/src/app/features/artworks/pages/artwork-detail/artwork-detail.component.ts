import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { extractId, toSlugId } from '../../../../shared/utils/slugify';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Artwork, Rating } from '../../../../core/models';
import { environment } from '../../../../environments/environment';
import { StarRatingComponent } from '../../../../shared/components/star-rating.component/star-rating.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb.component/breadcrumb.component';
import { ArtworkCardComponent } from '../../components/artwork-card.component';

@Component({
  selector: 'app-artwork-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StarRatingComponent,
    BreadcrumbComponent,
    ArtworkCardComponent
  ],
  templateUrl: './artwork-detail.component.html',
})
export class ArtworkDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiPlatformService<any>);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  artwork = signal<Artwork | null>(null);
  relatedArtworks = signal<Artwork[]>([]);
  loading = signal(true);

  // Pour l'affichage "charger plus" des notes
  displayedRatingsCount = signal(5);

  // État du modal de notation
  ratingModalOpen = signal(false);
  selectedScore = signal(0);
  ratingComment = signal('');
  submittingRating = signal(false);

  // Helpers d'authentification
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get currentUser() {
    return this.authService.currentUser;
  }

  // Computed: Récupérer l'artiste directement depuis l'œuvre
  artist = computed(() => {
    const art = this.artwork();
    if (!art?.artist) return null;
    // l'artiste est deja un objet embarque
    return typeof art.artist === 'object' ? art.artist : null;
  });

  // Computed: Récupérer toutes les notes de l'œuvre
  allRatings = computed(() => {
    const art = this.artwork();
    return (art?.ratings as Rating[]) || [];
  });

  // Computed: Notes à afficher (paginées)
  ratings = computed(() => {
    return this.allRatings().slice(0, this.displayedRatingsCount());
  });

  totalRatings = computed(() => this.allRatings().length);

  // Récupérer la propre note de l'utilisateur
  getUserRating(): Rating | null {
    if (!this.authService.isAuthenticated()) return null;
    const user = this.authService.currentUser;
    if (!user) return null;
    // Note : l'utilisateur en mode dev bypass n'a pas d'id, donc pas de correspondance en mode dev
    return null;
  }

  imageUrl = computed(() => {
    const art = this.artwork();
    if (art?.image?.contentUrl) return environment.apiBaseUrl + art.image.contentUrl;
    if (art?.imageUrl) return art.imageUrl;
    return 'assets/default-image.svg';
  });

  artistImageUrl = computed(() => {
    const a = this.artist();
    if (a?.profilePicture?.contentUrl) {
      return environment.apiBaseUrl + a.profilePicture.contentUrl;
    }
    if (a?.imageUrl) {
      return a.imageUrl;
    }
    return 'assets/default-avatar.svg';
  });

  averageRating = computed(() => {
    const all = this.allRatings();
    if (all.length === 0) return 0;
    const sum = all.reduce((acc: number, r: Rating) => acc + (r.score || 0), 0);
    return Math.round((sum / all.length) * 10) / 10;
  });

  // Répartition des notes (style Amazon)
  ratingBreakdown = computed(() => {
    const all = this.allRatings();
    const total = all.length;

    return [5, 4, 3, 2, 1].map(score => {
      const count = all.filter((r: Rating) => r.score === score).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return { score, count, percentage };
    });
  });

  hasMoreRatings = computed(() => {
    return this.displayedRatingsCount() < this.totalRatings();
  });

  remainingRatings = computed(() => {
    return Math.max(0, this.totalRatings() - this.displayedRatingsCount());
  });

  breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const art = this.artwork();
    return [
      { label: 'Accueil', url: '/' },
      { label: 'Œuvres', url: '/artworks' },
      { label: art?.title || 'Détail', url: undefined }
    ];
  });

  ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    if (!raw) {
      this.router.navigate(['/artworks']);
      return;
    }
    this.loadArtwork(extractId(raw));
  }

  private loadArtwork(id: string) {
    this.loading.set(true);

    this.api.get('artworks', id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (artwork: Artwork) => {
          // Bloquer si non validé et utilisateur non admin
          const pending = (artwork as any).toBeConfirmed === true || (artwork as any).isConfirmCreate === false;
          if (pending && !this.authService.isAdmin()) {
            this.loading.set(false);
            this.router.navigate(['/artworks']);
            return;
          }
          this.artwork.set(artwork);
          this.loading.set(false);
          this.loadRelatedArtworks();
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/artworks']);
        }
      });
  }

  private loadRelatedArtworks() {
    const artwork = this.artwork();
    if (!artwork) return;

    const filters: any = {};
    if (artwork.style) filters.style = artwork.style;

    this.api.list('artworks', 1, 4, filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const related = (res.items || []).filter((a: Artwork) => a.id !== artwork.id);
          this.relatedArtworks.set(related.slice(0, 3));
        },
        error: () => this.relatedArtworks.set([])
      });
  }

  loadMoreRatings() {
    this.displayedRatingsCount.set(this.displayedRatingsCount() + 5);
  }

  openRatingModal() {
    if (!this.isAuthenticated()) {
      if (confirm('Vous devez être connecté pour évaluer une œuvre. Voulez-vous vous connecter maintenant ?')) {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      }
      return;
    }

    const existing = this.getUserRating();
    if (existing) {
      this.selectedScore.set(existing.score || 0);
      this.ratingComment.set(existing.comment || '');
    } else {
      this.selectedScore.set(0);
      this.ratingComment.set('');
    }

    this.ratingModalOpen.set(true);
  }

  closeRatingModal() {
    this.ratingModalOpen.set(false);
    this.selectedScore.set(0);
    this.ratingComment.set('');
  }

  submitRating() {
    const artwork = this.artwork();
    if (!artwork?.id || this.selectedScore() === 0) return;

    this.submittingRating.set(true);

    const existing = this.getUserRating();
    const payload = {
      score: this.selectedScore(),
      comment: this.ratingComment() || null,
      artwork: `/api/artworks/${artwork.id}`
    };

    const request$ = existing
      ? this.api.patch('ratings', existing.id!.toString(), payload)
      : this.api.create('ratings', payload);

    request$.subscribe({
      next: () => {
        this.submittingRating.set(false);
        this.closeRatingModal();
        // Recharger l'œuvre pour avoir les notes mises à jour
        this.loadArtwork(artwork.id!.toString());
      },
      error: () => {
        this.submittingRating.set(false);
        alert('Erreur lors de l\'enregistrement de la note');
      }
    });
  }

  deleteRating() {
    const existing = this.getUserRating();
    if (!existing?.id) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer votre note ?')) return;

    const artworkId = this.artwork()?.id;

    this.api.delete('ratings', existing.id).subscribe({
      next: () => {
        // Recharger l'œuvre pour avoir les notes mises à jour
        if (artworkId) {
          this.loadArtwork(artworkId.toString());
        }
      },
      error: () => {
        alert('Erreur lors de la suppression de la note');
      }
    });
  }

  navigateToArtist() {
    const a = this.artist();
    if (a?.id) {
      this.router.navigate(['/artists', toSlugId(a.id, `${a.firstname} ${a.lastname}`)]);
    }
  }

  // Helper pour récupérer les infos utilisateur depuis la note
  getUserDisplayName(rating: Rating): string {
    if (rating.createdBy) {
      if (typeof rating.createdBy === 'object' && rating.createdBy.username) {
        return rating.createdBy.username;
      }
    }
    return 'Membre ArtHub';
  }

  getUserInitial(rating: Rating): string {
    const name = this.getUserDisplayName(rating);
    return name.charAt(0).toUpperCase();
  }

  // Formater la date relative
  formatRelativeDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `Il y a ${months} mois`;
    }
    const years = Math.floor(diffDays / 365);
    return `Il y a ${years} an${years > 1 ? 's' : ''}`;
  }
}
