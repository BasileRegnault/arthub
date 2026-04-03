import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Artist, Artwork } from '../../../../core/models';
import { toSlugId } from '../../../../shared/utils/slugify';
import { PaginatedResult } from '../../../../core/utils/hydra';
import { PaginationComponent } from '../../../../shared/components/pagination.component/pagination.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar.component/search-bar.component';
import { AppCountryAutocompleteComponent } from '../../../../shared/components/app-country-autocomplete.component/app-country-autocomplete.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-artists-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    SearchBarComponent,
    AppCountryAutocompleteComponent
  ],
  templateUrl: './artists-list.component.html',
})
export class ArtistsListComponent implements OnInit {
  private api = inject(ApiPlatformService<Artist>);
  private artworkApi = inject(ApiPlatformService<Artwork>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  artists = signal<PaginatedResult<Artist> | null>(null);
  artistTopArtworks = signal<Map<number, Artwork>>(new Map());
  loading = signal(false);
  filtersOpen = signal(false);

  page = signal(1);
  itemsPerPage = 18;

  searchTerm = signal('');
  selectedNationality = signal('');


  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const page = Number(params.get('page') ?? '1');
        this.page.set(page > 0 ? page : 1);

        this.searchTerm.set(params.get('search') ?? '');
        this.selectedNationality.set(params.get('nationality') ?? '');

        this.fetchArtists();
      });
  }

  fetchArtists() {
    this.loading.set(true);

    const filters: any = {
      'order[lastname]': 'asc'
    };

    if (this.searchTerm()) {
      // Rechercher dans le prénom et le nom
      filters.lastname = this.searchTerm();
    }
    if (this.selectedNationality()) {
      filters.nationality = this.selectedNationality();
    }

    this.api.list('artists', this.page(), this.itemsPerPage, filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.artists.set(res);
          this.loading.set(false);
          // Charger les œuvres principales des artistes affichés
          if (res.items) {
            this.loadArtistsTopArtworks(res.items);
          }
        },
        error: () => {
          this.loading.set(false);
          alert('Erreur lors du chargement des artistes');
        }
      });
  }

  private loadArtistsTopArtworks(artists: Artist[]) {
    // Regrouper toutes les requêtes en un seul forkJoin (évite N+1)
    const artistsWithId = artists.filter(a => !!a.id);
    if (!artistsWithId.length) return;

    const requests: Record<string, ReturnType<typeof this.artworkApi.list>> = {};
    artistsWithId.forEach(artist => {
      requests[String(artist.id)] = this.artworkApi.list('artworks', 1, 1, {
        'artist': `/api/artists/${artist.id}`,
        'order[viewsCount]': 'desc'
      });
    });

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => {
        const artworksMap = new Map<number, Artwork>();
        for (const [artistId, res] of Object.entries(results)) {
          const topArtwork = res.items?.[0];
          if (topArtwork) {
            artworksMap.set(Number(artistId), topArtwork);
          }
        }
        this.artistTopArtworks.set(artworksMap);
      });
  }

  updateUrl() {
    const queryParams: any = { page: this.page() };

    if (this.searchTerm()) queryParams.search = this.searchTerm();
    if (this.selectedNationality()) queryParams.nationality = this.selectedNationality();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page.set(1);
    this.updateUrl();
  }

  onFilterChange() {
    this.page.set(1);
    this.updateUrl();
  }

  onNationalitySelect(name: string | null) {
    this.selectedNationality.set(name ?? '');
    this.onFilterChange();
  }

  onPageChange(newPage: number) {
    this.page.set(newPage);
    this.updateUrl();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.selectedNationality.set('');
    this.page.set(1);
    this.updateUrl();
  }

  getArtistImageUrl(artist: Artist): string {
    if (artist.profilePicture?.contentUrl) {
      return environment.apiBaseUrl + artist.profilePicture.contentUrl;
    }
    if (artist.imageUrl) {
      return artist.imageUrl; // URL absolue (ex: portrait Wikipedia)
    }
    return 'assets/default-avatar.svg';
  }

  getArtistTopArtworkUrl(artist: Artist): string | null {
    if (!artist.id) return null;
    const artwork = this.artistTopArtworks().get(artist.id);
    if (artwork?.image?.contentUrl) return environment.apiBaseUrl + artwork.image.contentUrl;
    if (artwork?.imageUrl) return artwork.imageUrl;
    return null;
  }

  navigateToArtist(artist: Artist) {
    if (artist?.id) {
      this.router.navigate(['/artists', toSlugId(artist.id, `${artist.firstname} ${artist.lastname}`)]);
    }
  }
}
