import { Component, DestroyRef, input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { toSlugId } from '../../../shared/utils/slugify';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Artwork } from '../../../core/models/artwork.model';
import { environment } from '../../../environments/environment';
import { Artist } from '../../../core/models';
import { ApiPlatformService } from '../../../core/services/api-platform.service';

@Component({
  selector: 'app-artist-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './artist-card.component.html',
})
export class ArtistCardComponent {
  artist = input.required<Artist>();
  private api = inject(ApiPlatformService<any>);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  artistTopArtworks = signal<Map<number, Artwork>>(new Map());

  ngOnInit() {
    this.loadArtistsTopArtworks([this.artist()]);
  }


    getArtistImageUrl(artist: Artist): string {
      if (artist.profilePicture?.contentUrl) return environment.apiBaseUrl + artist.profilePicture.contentUrl;
      if (artist.imageUrl) return artist.imageUrl;
      return 'assets/default-avatar.svg';
    }

    getArtistTopArtworkUrl(artist: Artist): string | null {
      if (!artist.id) return null;
      const artwork = this.artistTopArtworks().get(artist.id);
      if (artwork?.image?.contentUrl) return environment.apiBaseUrl + artwork.image.contentUrl;
      if (artwork?.imageUrl) return artwork.imageUrl;
      return null;
    }
  
    navigateToArtist(artist = this.artist()) {
      if (artist?.id) {
        const slug = toSlugId(artist.id, `${artist.firstname} ${artist.lastname}`);
        this.router.navigate(['/artists', slug]);
      }
    }

    private loadArtistsTopArtworks(artists: Artist[]) {
        const artworksMap = new Map<number, Artwork>();
    
        artists.forEach(artist => {
          if (artist.id) {
            // Récupérer l'œuvre avec le plus de vues pour cet artiste
            this.api.list('artworks', 1, 1, {
              'artist.id': artist.id,
              'order[views]': 'desc'
            })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: res => {
                  const topArtwork = res.items?.[0];
                  if (topArtwork && artist.id) {
                    artworksMap.set(artist.id, topArtwork);
                    // Déclencher la réactivité en créant une nouvelle Map
                    this.artistTopArtworks.set(new Map(artworksMap));
                  }
                }
              });
          }
        });
      }
}
