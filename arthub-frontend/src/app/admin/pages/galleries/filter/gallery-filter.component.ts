import { CommonModule } from '@angular/common';
import { Component, inject, input, output, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SimpleUser } from '../../../../core/models';
import { AppUserAutocompleteComponent } from '../../../../shared/components/app-user-autocomplete.component/app-user-autocomplete.component';
import { DateRangeInputComponent } from '../../../../shared/components/date-range-input.component/date-range-input.component';
import { BooleanToggleComponent } from '../../../../shared/components/boolean-toggle.component/boolean-toggle.component';

@Component({
  selector: 'app-gallery-filter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppUserAutocompleteComponent, DateRangeInputComponent, BooleanToggleComponent],
  templateUrl: './gallery-filter.component.html',
  styleUrl: './gallery-filter.component.scss',
})
export class GalleryFilterComponent {
  // Sorties signal
  search = output<any>();
  reset = output<void>();

  // Entrée signal avec effet pour les mises à jour réactives
  initialFilters = input<any>(null);

  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [''],
    isPublic: [''] as ['' | true | false],
    createdAtAfter: [''],
    createdAtBefore: [''],
    updatedAtAfter: [''],
    updatedAtBefore: [''],
    createdBy: null as SimpleUser | null,
  });

  submit() {
    const v = this.form.value;

    const filters: any = {
      name: v.name,
      // Conversion en string pour l'URL (plus simple)
      isPublic: v.isPublic === '' ? '' : String(v.isPublic),
    };

    if (v.createdAtAfter) filters['createdAt[after]'] = v.createdAtAfter;
    if (v.createdAtBefore) filters['createdAt[before]'] = v.createdAtBefore;
    if (v.updatedAtAfter) filters['updatedAt[after]'] = v.updatedAtAfter;
    if (v.updatedAtBefore) filters['updatedAt[before]'] = v.updatedAtBefore;

    if (v.createdBy?.id) {
      filters['owner'] = `/api/users/${v.createdBy.id}`;
    }

    this.search.emit(filters);
  }

  resetFilters() {
    this.form.reset({
      name: '',
      isPublic: '',
      createdAtAfter: '',
      createdAtBefore: '',
      updatedAtAfter: '',
      updatedAtBefore: '',
      createdBy: null,
    });
    this.reset.emit();
  }

  setIsPublic(value: '' | true | false) {
    this.form.controls.isPublic.setValue(value);
  }
}
