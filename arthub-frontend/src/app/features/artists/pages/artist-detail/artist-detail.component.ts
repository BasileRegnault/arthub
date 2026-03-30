import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
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
    return a?.profilePicture?.contentUrl
      ? environment.apiBaseUrl + a.profilePicture.contentUrl
      : 'assets/default-avatar.png';
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
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/artists']);
      return;
    }
    this.loadArtist(id);
  }

  private loadArtist(id: string) {
    this.loading.set(true);

    this.api.get('artists', id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (artist: Artist) => {
          this.artist.set(artist);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          alert('Erreur lors du chargement de l\'artiste');
          this.router.navigate(['/artists']);
        }
      });
  }
}
