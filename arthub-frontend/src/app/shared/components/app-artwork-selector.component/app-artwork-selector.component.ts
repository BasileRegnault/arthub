import { Component, inject, OnInit, signal, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, map, of } from 'rxjs';
import { ApiPlatformService } from '../../../core/services/api-platform.service';
import { Artwork } from '../../../core/models/artwork.model';
import { environment } from '../../../environments/environment';

type ArtworkValue = Artwork[] | string[] | null;

@Component({
  selector: 'app-artwork-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-artwork-selector.component.html',
  styleUrls: ['./app-artwork-selector.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppArtworkSelectorComponent),
      multi: true
    }
  ]
})
export class AppArtworkSelectorComponent implements OnInit, ControlValueAccessor {
  private api = inject(ApiPlatformService<Artwork>);

  searchControl = new FormControl('');
  searchResults = signal<Artwork[]>([]);
  selectedArtworks = signal<Artwork[]>([]);
  showDropdown = signal(false);
  loading = signal(false);
  searchError = signal<string | null>(null);
  loadingArtworkIds = signal<number[]>([]);

  private onChange: (value: string[] | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly apiBaseUrl = environment.apiBaseUrl;

  ngOnInit() {
    // Configuration de la recherche par autocompletion
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => this.searchArtworks(val))
    ).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.loading.set(false);
        this.searchError.set(null);
        this.showDropdown.set(results.length > 0);
      },
      error: (error) => {
        console.error('Erreur recherche artworks:', error);
        this.loading.set(false);
        this.searchError.set('Erreur lors de la recherche des œuvres');
        this.searchResults.set([]);
        this.showDropdown.set(false);
      }
    });
  }

  private searchArtworks(query: string | null) {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    this.loading.set(true);

    return this.api.list('artworks', 1, 20, {
      title: query.trim()
    }).pipe(
      map(res => {
        // Exclure les oeuvres deja selectionnees
        const selectedIds = this.selectedArtworks().map(a => a.id);
        return res.items.filter(artwork => !selectedIds.includes(artwork.id));
      })
    );
  }

  addArtwork(artwork: Artwork) {
    const current = this.selectedArtworks();
    if (!current.find(a => a.id === artwork.id)) {
      this.selectedArtworks.set([...current, artwork]);
      this.notifyChange();
    }

    // Reinitialiser la recherche
    this.searchControl.setValue('', { emitEvent: false });
    this.showDropdown.set(false);
    this.searchResults.set([]);
  }

  removeArtwork(artworkId: number) {
    const current = this.selectedArtworks();
    this.selectedArtworks.set(current.filter(a => a.id !== artworkId));
    this.notifyChange();
  }

  private notifyChange() {
    const iris = this.selectedArtworks().map(a => a['@id'] || `/api/artworks/${a.id}`);
    this.onChange(iris.length > 0 ? iris : null);
    this.onTouched();
  }

  getImageUrl(artwork: Artwork): string {
    if (artwork.image?.contentUrl) {
      return this.apiBaseUrl + artwork.image.contentUrl;
    }
    return 'assets/placeholder-artwork.png';
  }

  getArtistName(artwork: Artwork): string {
    if (typeof artwork.artist === 'object' && artwork.artist) {
      return `${artwork.artist.firstname || ''} ${artwork.artist.lastname || ''}`.trim();
    }
    return 'Artiste inconnu';
  }

  onSearchFocus() {
    if (this.searchResults().length > 0) {
      this.showDropdown.set(true);
    }
  }

  onSearchBlur() {
    // Delai pour permettre le clic sur les elements du dropdown
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  // Implementation de ControlValueAccessor
  writeValue(value: ArtworkValue): void {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      this.selectedArtworks.set([]);
      return;
    }

    if (Array.isArray(value)) {
      // Verifier si on a des objets complets ou juste des IRI
      if (value.length > 0 && typeof value[0] === 'object') {
        this.selectedArtworks.set(value as Artwork[]);
      } else if (typeof value[0] === 'string') {
        // Charger les oeuvres depuis les IRI
        this.loadArtworksFromIris(value as string[]);
      }
    }
  }

  private loadArtworksFromIris(iris: string[]) {
    const ids = iris.map(iri => this.extractIdFromIri(iri)).filter(id => id !== null) as number[];

    if (ids.length === 0) {
      this.selectedArtworks.set([]);
      this.loadingArtworkIds.set([]);
      return;
    }

    // Afficher l'etat de chargement
    this.loadingArtworkIds.set(ids);

    // Charger toutes les oeuvres en parallele
    const requests = ids.map(id => this.api.get('artworks', id));

    const artworks: Artwork[] = [];
    let completed = 0;

    requests.forEach((req, index) => {
      req.subscribe({
        next: (artwork) => {
          artworks.push(artwork);
          completed++;
          if (completed === requests.length) {
            this.selectedArtworks.set(artworks);
            this.loadingArtworkIds.set([]);
          }
        },
        error: (error) => {
          console.error(`Erreur chargement artwork ${ids[index]}:`, error);
          completed++;
          if (completed === requests.length) {
            this.selectedArtworks.set(artworks);
            this.loadingArtworkIds.set([]);
          }
        }
      });
    });
  }

  private extractIdFromIri(iri: string): number | null {
    const match = iri.match(/\/artworks\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.searchControl.disable() : this.searchControl.enable();
  }

  isArtworkLoading(artworkId: number): boolean {
    return this.loadingArtworkIds().includes(artworkId);
  }
}
