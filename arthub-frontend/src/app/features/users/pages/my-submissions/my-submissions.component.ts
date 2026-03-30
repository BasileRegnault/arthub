import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Artwork, Artist } from '../../../../core/models';
import { environment } from '../../../../environments/environment';

type SubmissionTab = 'artworks' | 'artists';

@Component({
  selector: 'app-my-submissions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-submissions.component.html',
})
export class MySubmissionsComponent implements OnInit {
  private api = inject(ApiPlatformService<any>);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly apiBaseUrl = environment.apiBaseUrl;

  activeTab = signal<SubmissionTab>('artworks');

  // Œuvres en attente
  pendingArtworks = signal<Artwork[]>([]);
  artworksLoading = signal(false);
  artworksTotal = signal(0);

  // Artistes en attente
  pendingArtists = signal<Artist[]>([]);
  artistsLoading = signal(false);
  artistsTotal = signal(0);

  // Historique (validées/refusées)
  historyArtworks = signal<Artwork[]>([]);
  historyArtists = signal<Artist[]>([]);

  ngOnInit() {
    this.authService.loadCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          if (user?.id) {
            this.loadPendingArtworks(user.id);
            this.loadPendingArtists(user.id);
            this.loadHistoryArtworks(user.id);
            this.loadHistoryArtists(user.id);
          }
        }
      });
  }

  private loadPendingArtworks(userId: number) {
    this.artworksLoading.set(true);

    this.api.list('artworks', 1, 50, {
      createdBy: `/api/users/${userId}`,
      isConfirmCreate: false,
      toBeConfirmed: true,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.pendingArtworks.set(res.items || []);
          this.artworksTotal.set(res.total || 0);
          this.artworksLoading.set(false);
        },
        error: () => {
          this.artworksLoading.set(false);
        }
      });
  }

  private loadPendingArtists(userId: number) {
    this.artistsLoading.set(true);

    this.api.list('artists', 1, 50, {
      createdBy: `/api/users/${userId}`,
      isConfirmCreate: false,
      toBeConfirmed: true,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.pendingArtists.set(res.items || []);
          this.artistsTotal.set(res.total || 0);
          this.artistsLoading.set(false);
        },
        error: () => {
          this.artistsLoading.set(false);
        }
      });
  }

  private loadHistoryArtworks(userId: number) {
    // Charger les œuvres validées ou refusées (isConfirmCreate = true ou rejectedAt != null)
    this.api.list('artworks', 1, 20, {
      createdBy: `/api/users/${userId}`,
      isConfirmCreate: true,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.historyArtworks.set(res.items || []);
        }
      });
  }

  private loadHistoryArtists(userId: number) {
    this.api.list('artists', 1, 20, {
      createdBy: `/api/users/${userId}`,
      isConfirmCreate: true,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.historyArtists.set(res.items || []);
        }
      });
  }

  getArtworkImage(artwork: any): string {
    if (artwork?.image?.contentUrl) {
      return this.apiBaseUrl + artwork.image.contentUrl;
    }
    return 'assets/default-artwork.png';
  }

  getArtistImage(artist: any): string {
    if (artist?.profilePicture?.contentUrl) {
      return this.apiBaseUrl + artist.profilePicture.contentUrl;
    }
    return 'assets/default-avatar.png';
  }

  getArtistName(artist: any): string {
    if (!artist) return 'Artiste inconnu';
    if (typeof artist === 'object') {
      return `${artist.firstname || ''} ${artist.lastname || ''}`.trim() || 'Artiste inconnu';
    }
    return 'Artiste inconnu';
  }

  formatDate(dateString: string | undefined | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
