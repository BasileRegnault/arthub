import { Component, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ArtworkStyle, ArtworkType, SimpleArtist, SimpleUser } from '../../../../core/models';
import { AppArtistAutocompleteComponent } from '../../../../shared/components/app-artist-autocomplete.component/app-artist-autocomplete.component';
import { AppUserAutocompleteComponent } from '../../../../shared/components/app-user-autocomplete.component/app-user-autocomplete.component';
import { DateRangeInputComponent } from '../../../../shared/components/date-range-input.component/date-range-input.component';
import { BooleanToggleComponent } from '../../../../shared/components/boolean-toggle.component/boolean-toggle.component';

@Component({
  selector: 'app-artworks-filter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppArtistAutocompleteComponent, AppUserAutocompleteComponent, DateRangeInputComponent, BooleanToggleComponent],
  templateUrl: './artworks-filter.component.html',
})
export class ArtworksFilterComponent {
  types = Object.values(ArtworkType);
  styles = Object.values(ArtworkStyle);

  // Sorties signal
  search = output<any>();
  reset = output<void>();

  // Entrée signal avec effet pour les mises à jour réactives
  initialFilters = input<any>(null);

  private fb = inject(FormBuilder);

  form = this.fb.group({
    title: [''],
    artist: [null as SimpleArtist | string | null],     // accepte IRI string
    createdBy: [null as SimpleUser | string | null],    // accepte IRI string

    type: [''],
    style: [''],
    location: [''],

    creationDateAfter: [''],
    creationDateBefore: [''],
    createdAtAfter: [''],
    createdAtBefore: [''],

    isDisplay: [''] as ['' | true | false],
  });

  constructor() {
    // Effet pour gérer les changements de initialFilters (remplace le setter @Input)
    effect(() => {
      const f = this.initialFilters();
      if (!f) return;

      this.form.patchValue({
        title: f.title ?? '',
        type: f.type ?? '',
        style: f.style ?? '',
        location: f.location ?? '',

        // bool reconstruit depuis le parent
        isDisplay: f.isDisplay ?? '',

        // dates API Platform
        creationDateAfter: f['creationDate[after]'] ?? '',
        creationDateBefore: f['creationDate[before]'] ?? '',
        createdAtAfter: f['createdAt[after]'] ?? '',
        createdAtBefore: f['createdAt[before]'] ?? '',

        // IRI direct => autocompletes vont fetch le libellé
        artist: f.artist ?? null,
        createdBy: f.createdBy ?? null,
      }, { emitEvent: false });
    });
  }

  submit() {
    const v = this.form.value;

    const filters: any = {
      title: v.title ?? '',
      type: v.type ?? '',
      style: v.style ?? '',
      location: v.location ?? '',
    };

    // isDisplay => Compatible URL 'true'/'false'
    if (v.isDisplay !== '') {
      filters['isDisplay'] = String(v.isDisplay);
    }

    // artist => si objet: IRI, si string: déjà IRI
    if (typeof v.artist === 'string') {
      filters['artist'] = v.artist;
    } else if (v.artist?.id) {
      filters['artist'] = `/api/artists/${v.artist.id}`;
    }

    // createdBy => si objet: IRI, si string: déjà IRI
    if (typeof v.createdBy === 'string') {
      filters['createdBy'] = v.createdBy;
    } else if (v.createdBy?.id) {
      filters['createdBy'] = `/api/users/${v.createdBy.id}`;
    }

    // creationDate entre deux dates
    if (v.creationDateAfter) filters['creationDate[after]'] = v.creationDateAfter;
    if (v.creationDateBefore) filters['creationDate[before]'] = v.creationDateBefore;

    // createdAt entre deux dates
    if (v.createdAtAfter) filters['createdAt[after]'] = v.createdAtAfter;
    if (v.createdAtBefore) filters['createdAt[before]'] = v.createdAtBefore;

    this.search.emit(filters);
  }

  resetFilters() {
    this.form.reset({
      title: '',
      artist: null,
      createdBy: null,
      type: '',
      style: '',
      location: '',
      creationDateAfter: '',
      creationDateBefore: '',
      createdAtAfter: '',
      createdAtBefore: '',
      isDisplay: '',
    });
    this.reset.emit();
  }

  setIsDisplay(value: '' | true | false) {
    this.form.controls.isDisplay.setValue(value);
  }
}
