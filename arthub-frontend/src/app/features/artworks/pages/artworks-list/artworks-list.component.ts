import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Artwork, SimpleArtist } from '../../../../core/models';
import { PaginatedResult } from '../../../../core/utils/hydra';
import { ArtworkCardComponent } from '../../components/artwork-card.component';
import { PaginationComponent } from '../../../../shared/components/pagination.component/pagination.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar.component/search-bar.component';
import { AppArtistAutocompleteComponent } from '../../../../shared/components/app-artist-autocomplete.component/app-artist-autocomplete.component';

@Component({
  selector: 'app-artworks-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ArtworkCardComponent,
    PaginationComponent,
    SearchBarComponent,
    AppArtistAutocompleteComponent
  ],
  templateUrl: './artworks-list.component.html',
})
export class ArtworksListComponent implements OnInit {
  private api = inject(ApiPlatformService<Artwork>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  artworks = signal<PaginatedResult<Artwork> | null>(null);
  loading = signal(false);

  page = signal(1);
  itemsPerPage = 20;

  // Filtres
  searchTerm = signal('');
  selectedType = signal('');
  selectedStyle = signal('');
  selectedLocation = signal('');
  selectedArtist = signal<SimpleArtist | null>(null);
  selectedPeriodStart = signal('');
  selectedPeriodEnd = signal('');
  sortBy = signal('recent');

  // Options disponibles
  types = ['Peinture', 'Sculpture', 'Photographie', 'Dessin', 'Gravure', 'Installation'];
  styles = ['Abstrait', 'Realisme', 'Impressionnisme', 'Moderne', 'Contemporain', 'Classique'];
  locations = [
    'France', 'Italie', 'Espagne', 'Allemagne', 'Royaume-Uni', 'Pays-Bas',
    'Belgique', 'Etats-Unis', 'Japon', 'Chine', 'Russie', 'Autriche'
  ];
  sortOptions = [
    { value: 'recent', label: 'Plus recents' },
    { value: 'oldest', label: 'Plus anciens' },
    { value: 'title', label: 'Titre (A-Z)' }
  ];

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const page = Number(params.get('page') ?? '1');
        this.page.set(page > 0 ? page : 1);

        this.searchTerm.set(params.get('search') ?? '');
        this.selectedType.set(params.get('type') ?? '');
        this.selectedStyle.set(params.get('style') ?? '');
        this.selectedLocation.set(params.get('location') ?? '');
        this.selectedPeriodStart.set(params.get('periodStart') ?? '');
        this.selectedPeriodEnd.set(params.get('periodEnd') ?? '');
        this.sortBy.set(params.get('sort') ?? 'recent');

        // Gérer l'artiste depuis l'URL - définir comme IRI pour que l'autocomplete le résolve
        const artistId = params.get('artist');
        if (artistId && !this.selectedArtist()) {
          // Définir l'IRI pour que l'autocomplete puisse le résoudre
          this.selectedArtist.set({ id: Number(artistId) } as SimpleArtist);
        }

        this.fetchArtworks();
      });
  }

  fetchArtworks() {
    this.loading.set(true);

    const filters: any = {};

    if (this.searchTerm()) {
      filters.title = this.searchTerm();
    }
    if (this.selectedType()) {
      filters.type = this.selectedType();
    }
    if (this.selectedStyle()) {
      filters.style = this.selectedStyle();
    }
    if (this.selectedLocation()) {
      filters.location = this.selectedLocation();
    }
    if (this.selectedArtist()?.id) {
      filters['artist.id'] = this.selectedArtist()!.id;
    }
    if (this.selectedPeriodStart()) {
      filters['creationDate[after]'] = this.selectedPeriodStart() + '-01-01';
    }
    if (this.selectedPeriodEnd()) {
      filters['creationDate[before]'] = this.selectedPeriodEnd() + '-12-31';
    }

    // Tri
    if (this.sortBy() === 'recent') {
      filters['order[createdAt]'] = 'desc';
    } else if (this.sortBy() === 'oldest') {
      filters['order[createdAt]'] = 'asc';
    } else if (this.sortBy() === 'title') {
      filters['order[title]'] = 'asc';
    }

    this.api.list('artworks', this.page(), this.itemsPerPage, filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.artworks.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          alert('Erreur lors du chargement des oeuvres');
        }
      });
  }

  updateUrl() {
    const queryParams: any = { page: this.page() };

    if (this.searchTerm()) queryParams.search = this.searchTerm();
    if (this.selectedType()) queryParams.type = this.selectedType();
    if (this.selectedStyle()) queryParams.style = this.selectedStyle();
    if (this.selectedLocation()) queryParams.location = this.selectedLocation();
    if (this.selectedArtist()?.id) queryParams.artist = this.selectedArtist()!.id;
    if (this.selectedPeriodStart()) queryParams.periodStart = this.selectedPeriodStart();
    if (this.selectedPeriodEnd()) queryParams.periodEnd = this.selectedPeriodEnd();
    if (this.sortBy() !== 'recent') queryParams.sort = this.sortBy();

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

  onPageChange(newPage: number) {
    this.page.set(newPage);
    this.updateUrl();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.selectedType.set('');
    this.selectedStyle.set('');
    this.selectedLocation.set('');
    this.selectedArtist.set(null);
    this.selectedPeriodStart.set('');
    this.selectedPeriodEnd.set('');
    this.sortBy.set('recent');
    this.page.set(1);
    this.updateUrl();
  }

  onArtistSelect(artist: SimpleArtist | null) {
    this.selectedArtist.set(artist);
    this.onFilterChange();
  }
}
