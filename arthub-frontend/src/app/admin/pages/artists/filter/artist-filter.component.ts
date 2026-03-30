import { CommonModule } from '@angular/common';
import { Component, inject, input, output, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SimpleUser } from '../../../../core/models';
import { AppUserAutocompleteComponent } from '../../../../shared/components/app-user-autocomplete.component/app-user-autocomplete.component';
import { DateRangeInputComponent } from '../../../../shared/components/date-range-input.component/date-range-input.component';
import { BooleanToggleComponent } from '../../../../shared/components/boolean-toggle.component/boolean-toggle.component';

@Component({
  selector: 'app-artists-filter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppUserAutocompleteComponent, DateRangeInputComponent, BooleanToggleComponent],
  templateUrl: './artist-filter.component.html',
  styleUrl: './artist-filter.component.scss',
})
export class ArtistsFilterComponent {
  // Sorties signal
  search = output<any>();
  reset = output<void>();

  // Entrée signal avec effet pour les mises à jour réactives
  initialFilters = input<any>(null);

  private fb = inject(FormBuilder);

  form = this.fb.group({
    firstname: [''],
    lastname: [''],
    nationality: [''],
    isConfirmCreate: [''] as ['' | true | false],

    bornAtAfter: [''],
    bornAtBefore: [''],
    diedAtAfter: [''],
    diedAtBefore: [''],
    createdAtAfter: [''],
    createdAtBefore: [''],
    updatedAtAfter: [''],
    updatedAtBefore: [''],

    createdBy: null as SimpleUser | null,
  });

  constructor() {
    // Effet pour gérer les changements de initialFilters (remplace le setter @Input)
    effect(() => {
      const f = this.initialFilters();
      if (!f) return;

      this.form.patchValue({
        firstname: f.firstname ?? '',
        lastname: f.lastname ?? '',
        nationality: f.nationality ?? '',

        // f.isConfirmCreate peut être true/false (reconstruit depuis URL)
        isConfirmCreate: f.isConfirmCreate ?? '',

        bornAtAfter: f['bornAt[after]'] ?? '',
        bornAtBefore: f['bornAt[before]'] ?? '',
        diedAtAfter: f['diedAt[after]'] ?? '',
        diedAtBefore: f['diedAt[before]'] ?? '',
        createdAtAfter: f['createdAt[after]'] ?? '',
        createdAtBefore: f['createdAt[before]'] ?? '',
        updatedAtAfter: f['updatedAt[after]'] ?? '',
        updatedAtBefore: f['updatedAt[before]'] ?? '',
        createdBy: f.createdBy ?? null,
      }, { emitEvent: false });
    });
  }

  submit() {
    const v = this.form.value;

    const filters: any = {
      firstname: v.firstname,
      lastname: v.lastname,
      nationality: v.nationality,

      // Compatible URL
      isConfirmCreate: v.isConfirmCreate === '' ? '' : String(v.isConfirmCreate),
    };

    if (v.bornAtAfter) filters['bornAt[after]'] = v.bornAtAfter;
    if (v.bornAtBefore) filters['bornAt[before]'] = v.bornAtBefore;

    if (v.diedAtAfter) filters['diedAt[after]'] = v.diedAtAfter;
    if (v.diedAtBefore) filters['diedAt[before]'] = v.diedAtBefore;

    if (v.createdAtAfter) filters['createdAt[after]'] = v.createdAtAfter;
    if (v.createdAtBefore) filters['createdAt[before]'] = v.createdAtBefore;

    if (v.updatedAtAfter) filters['updatedAt[after]'] = v.updatedAtAfter;
    if (v.updatedAtBefore) filters['updatedAt[before]'] = v.updatedAtBefore;

    if (v.createdBy?.id) {
      filters['createdBy'] = `/api/users/${v.createdBy.id}`;
    }

    this.search.emit(filters);
  }

  resetFilters() {
    this.form.reset({
      firstname: '',
      lastname: '',
      nationality: '',
      isConfirmCreate: '',
      bornAtAfter: '',
      bornAtBefore: '',
      diedAtAfter: '',
      diedAtBefore: '',
      createdAtAfter: '',
      createdAtBefore: '',
      updatedAtAfter: '',
      updatedAtBefore: '',
      createdBy: null,
    });
    this.reset.emit();
  }

  setIsConfirmCreate(value: '' | true | false) {
    this.form.controls.isConfirmCreate.setValue(value);
  }
}
