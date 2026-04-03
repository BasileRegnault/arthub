import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Gallery, Artwork } from '../../../../core/models';
import { environment } from '../../../../environments/environment';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb.component/breadcrumb.component';
import { ArtworkCardComponent } from '../../../artworks/components/artwork-card.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-gallery-detail',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbComponent,
    ArtworkCardComponent
  ],
  templateUrl: './gallery-detail.component.html',
})
export class GalleryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiPlatformService<any>);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  gallery = signal<Gallery | null>(null);
  loading = signal(true);

  coverImageUrl = computed(() => {
    const g = this.gallery();
    if (g?.coverImage?.contentUrl) return environment.apiBaseUrl + g.coverImage.contentUrl;
    // Utiliser la première œuvre comme image de couverture
    const artworks = g?.artworks as any[];
    if (artworks?.length > 0 && typeof artworks[0] === 'object') {
      const first = artworks[0];
      if (first.image?.contentUrl) return environment.apiBaseUrl + first.image.contentUrl;
      if (first.imageUrl) return first.imageUrl;
    }
    return 'assets/default-gallery.svg';
  });

  // Computed : Recuperer les oeuvres directement depuis la galerie (donnees embarquees)
  artworks = computed(() => {
    const g = this.gallery();
    if (!g?.artworks) return [];
    // Les oeuvres peuvent etre des objets embarques ou des IRI
    if (Array.isArray(g.artworks) && g.artworks.length > 0) {
      if (typeof g.artworks[0] === 'object') {
        return g.artworks as Artwork[];
      }
    }
    return [];
  });

  breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const g = this.gallery();
    return [
      { label: 'Accueil', url: '/' },
      { label: 'Galeries', url: '/galleries' },
      { label: g?.name || 'Détail', url: undefined }
    ];
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/galleries']);
      return;
    }
    this.loadGallery(id);
  }

  private loadGallery(id: string) {
    this.loading.set(true);

    this.api.get('galleries', id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (gallery: Gallery) => {
          this.gallery.set(gallery);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.show('Erreur lors du chargement de la galerie', 'error');
          this.router.navigate(['/galleries']);
        }
      });
  }
}
