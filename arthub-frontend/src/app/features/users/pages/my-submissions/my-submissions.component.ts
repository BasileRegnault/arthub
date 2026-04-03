import { Component, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSlugId } from '../../../../shared/utils/slugify';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Artwork, Artist } from '../../../../core/models';
import { environment } from '../../../../environments/environment';

type SubmissionTab = 'artworks' | 'artists';

interface ValidationDecision {
  id: number;
  subjectType: 'artist' | 'artwork';
  subjectId: number;
  status: 'approved' | 'rejected';
  reason: string | null;
  createdAt: string;
  subject: any;
}

@Component({
  selector: 'app-my-submissions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-submissions.component.html',
})
export class MySubmissionsComponent implements OnInit {
  private api = inject(ApiPlatformService<any>);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly apiBaseUrl = environment.apiBaseUrl;
  readonly apiUrl = environment.apiUrl;

  activeTab = signal<SubmissionTab>('artworks');

  // Œuvres en attente
  pendingArtworks = signal<Artwork[]>([]);
  artworksLoading = signal(false);
  artworksTotal = signal(0);

  // Artistes en attente
  pendingArtists = signal<Artist[]>([]);
  artistsLoading = signal(false);
  artistsTotal = signal(0);

  // Historique (décisions de validation)
  validationHistory = signal<ValidationDecision[]>([]);
  historyLoading = signal(false);

  ngOnInit() {
    this.authService.loadCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          if (user?.id) {
            this.loadPendingArtworks(user.id);
            this.loadPendingArtists(user.id);
            this.loadValidationHistory();
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

  private loadValidationHistory() {
    this.historyLoading.set(true);

    this.http.get<{ items: ValidationDecision[]; total: number }>(`${this.apiUrl}/my-validations`, {
      params: { itemsPerPage: '50' }
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.validationHistory.set(res.items || []);
          this.historyLoading.set(false);
        },
        error: () => {
          this.historyLoading.set(false);
        }
      });
  }

  getArtworkImage(artwork: any): string {
    if (artwork?.image?.contentUrl) {
      return this.apiBaseUrl + artwork.image.contentUrl;
    }
    return 'assets/default-image.svg';
  }

  getArtistImage(artist: any): string {
    if (artist?.profilePicture?.contentUrl) {
      return this.apiBaseUrl + artist.profilePicture.contentUrl;
    }
    return 'assets/default-avatar.svg';
  }

  getSubjectImage(decision: ValidationDecision): string {
    if (decision.subjectType === 'artwork') {
      return this.getArtworkImage(decision.subject);
    }
    return this.getArtistImage(decision.subject);
  }

  getSubjectName(decision: ValidationDecision): string {
    const s = decision.subject;
    if (!s) return `#${decision.subjectId}`;
    if (decision.subjectType === 'artwork') return s.title || `#${decision.subjectId}`;
    return `${s.firstname || ''} ${s.lastname || ''}`.trim() || `#${decision.subjectId}`;
  }

  getSubjectLink(decision: ValidationDecision): string[] {
    const base = decision.subjectType === 'artwork' ? 'artworks' : 'artists';
    const name = this.getSubjectName(decision);
    const segment = toSlugId(decision.subjectId, name);
    return [`/${base}`, segment];
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
