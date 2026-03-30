import { Component, inject, OnInit, signal, computed, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, map, of } from 'rxjs';
import { ApiPlatformService } from '../../../core/services/api-platform.service';
import { SimpleArtist } from '../../../core/models';

type ArtistValue = SimpleArtist | string | null; // string = IRI "/api/artists/34"

@Component({
  selector: 'app-artist-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-artist-autocomplete.component.html',
  styleUrls: ['./app-artist-autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppArtistAutocompleteComponent),
      multi: true
    }
  ]
})
export class AppArtistAutocompleteComponent implements OnInit, ControlValueAccessor {

  private api = inject(ApiPlatformService<SimpleArtist>);

  inputControl = new FormControl('');
  allArtists = signal<SimpleArtist[]>([]);
  remoteArtists = signal<SimpleArtist[]>([]);
  defaultArtists = signal<SimpleArtist[]>([]); // 5 premiers artistes à afficher par défaut
  showDropdown = signal(false);
  loading = signal(false);
  hasSearched = signal(false); // Pour savoir si l'utilisateur a tapé quelque chose

  value: SimpleArtist | null = null;
  private onChange: (value: SimpleArtist | null) => void = () => {};
  protected onTouched: () => void = () => {};

  ngOnInit() {
    // Charger les premiers artistes pour affichage par défaut
    this.api.list('artists', 1, 100).subscribe(res => {
      this.allArtists.set(res.items);
      // Prendre les 5 premiers pour l'affichage par défaut
      this.defaultArtists.set(res.items.slice(0, 5));
    });

    // autocomplete
    this.inputControl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(val => this.filterArtists(val))
    ).subscribe(res => {
      this.remoteArtists.set(res);
      this.loading.set(false);
    });

    // optionnel : effacement => clear la valeur
    this.inputControl.valueChanges.subscribe(val => {
      if (val === '' && this.value) {
        this.value = null;
        this.onChange(null);
        this.hasSearched.set(false);
      }
    });
  }

  private filterArtists(val: string | SimpleArtist | null) {
    if (!val || typeof val !== 'string' || val.trim().length < 2) {
      this.remoteArtists.set([]);
      this.hasSearched.set(false);
      return of([]);
    }

    this.hasSearched.set(true);
    const query = val.trim().toLowerCase();

    const localResults = this.allArtists().filter(a =>
      (a.firstname ?? '').toLowerCase().includes(query) ||
      (a.lastname ?? '').toLowerCase().includes(query)
    );

    if (localResults.length >= 10) {
      return of(localResults);
    }

    this.loading.set(true);

    return this.api.list('artists', 1, 20, {
      firstname: query,
      lastname: query
    }).pipe(
      map(res => {
        const remoteOnly = res.items.filter(r => !localResults.find(l => l.id === r.id));
        return [...localResults, ...remoteOnly];
      })
    );
  }

  selectArtist(artist: SimpleArtist) {
    this.value = artist;
    this.inputControl.setValue(this.displayFn(artist), { emitEvent: false });
    this.showDropdown.set(false);
    this.remoteArtists.set([]);
    this.hasSearched.set(false);
    this.onChange(artist);
  }

  onFocus() {
    this.showDropdown.set(true);
    this.onTouched();
  }

  onBlur() {
    // Délai pour permettre le clic sur les éléments du dropdown
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  displayFn(artist: SimpleArtist | null) {
    return artist ? `${artist.firstname ?? ''} ${artist.lastname ?? ''}`.trim() : '';
  }

  // --- Prise en charge des IRI ---
  private extractIdFromIri(iri: string): number | null {
    const m = iri.match(/\/artists\/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  // Implementation de ControlValueAccessor
  writeValue(obj: ArtistValue): void {
    if (!obj) {
      this.value = null;
      this.inputControl.setValue('', { emitEvent: false });
      return;
    }

    // cas objet
    if (typeof obj === 'object') {
      this.value = obj;
      this.inputControl.setValue(this.displayFn(obj), { emitEvent: false });
      return;
    }

    // cas IRI string "/api/artists/34"
    const id = this.extractIdFromIri(obj);
    if (!id) {
      this.value = null;
      this.inputControl.setValue('', { emitEvent: false });
      return;
    }

    if (this.value?.id === id) {
      this.inputControl.setValue(this.displayFn(this.value), { emitEvent: false });
      return;
    }

    this.inputControl.setValue(`Artiste #${id}`, { emitEvent: false });

    this.api.get('artists', id).subscribe({
      next: (a) => {
        this.value = a;
        this.inputControl.setValue(this.displayFn(a) || `Artiste #${id}`, { emitEvent: false });

        // enrichit cache local si absent
        const exists = this.allArtists().some(x => x.id === a.id);
        if (!exists) this.allArtists.set([a, ...this.allArtists()]);
      },
      error: () => {
        this.value = null;
        this.inputControl.setValue(`Artiste #${id}`, { emitEvent: false });
      }
    });
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.inputControl.disable() : this.inputControl.enable();
  }

  get results() {
    return computed(() => {
      // Si l'utilisateur a recherché, montrer les résultats de recherche
      if (this.hasSearched() || this.inputControl.value) {
        return this.remoteArtists();
      }
      // Sinon, montrer les 5 premiers artistes par défaut
      return this.defaultArtists();
    });
  }

  get shouldShowNoResults(): boolean {
    return this.hasSearched() &&
           !this.loading() &&
           this.remoteArtists().length === 0 &&
           this.inputControl.value !== null &&
           this.inputControl.value !== '';
  }
}
