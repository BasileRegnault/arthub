import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { extractId } from '../../../../shared/utils/slugify';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Artist, Artwork } from '../../../../core/models';
import { environment } from '../../../../environments/environment';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb.component/breadcrumb.component';
import { ArtworkCardComponent } from '../../../artworks/components/artwork-card.component';

@Component({
  selector: 'app-artist-detail',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbComponent,
    ArtworkCardComponent
  ],
  templateUrl: './artist-detail.component.html',
})
export class ArtistDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiPlatformService<any>);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  artist = signal<Artist | null>(null);
  loading = signal(true);

  // Computed: Récupérer les œuvres directement depuis l'artiste (données embarquées)
  artworks = computed(() => {
    const a = this.artist();
    if (!a?.artworks) return [];
    // artworks peut être des objets embarqués ou des IRI
    if (Array.isArray(a.artworks) && a.artworks.length > 0) {
      // Vérifier si le premier élément est un objet (embarqué) ou une chaîne (IRI)
      if (typeof a.artworks[0] === 'object') {
        return a.artworks as Artwork[];
      }
    }
    return [];
  });

  profileImageUrl = computed(() => {
    const a = this.artist();
    if (a?.profilePicture?.contentUrl) {
      return environment.apiBaseUrl + a.profilePicture.contentUrl;
    }
    if (a?.imageUrl) {
      return a.imageUrl;
    }
    return 'assets/default-avatar.svg';
  });

  breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const a = this.artist();
    return [
      { label: 'Accueil', url: '/' },
      { label: 'Artistes', url: '/artists' },
      { label: a ? `${a.firstname} ${a.lastname}` : 'Détail', url: undefined }
    ];
  });

  ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    if (!raw) {
      this.router.navigate(['/artists']);
      return;
    }
    this.loadArtist(extractId(raw));
  }

  private loadArtist(id: string) {
    this.loading.set(true);

    this.api.get('artists', id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (artist: Artist) => {
          // Bloquer si non validé et utilisateur non admin
          const pending = (artist as any).toBeConfirmed === true || (artist as any).isConfirmCreate === false;
          if (pending && !this.authService.isAdmin()) {
            this.loading.set(false);
            this.router.navigate(['/artists']);
            return;
          }
          this.artist.set(artist);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/artists']);
        }
      });
  }
}
