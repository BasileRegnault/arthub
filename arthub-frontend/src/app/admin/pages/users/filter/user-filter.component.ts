import { Component, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { UserRole } from '../../../../core/models/enum/ser-role.enum';
import { DateRangeInputComponent } from '../../../../shared/components/date-range-input.component/date-range-input.component';

@Component({
  selector: 'app-user-filter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateRangeInputComponent],
  templateUrl: './user-filter.component.html',
})
export class UserFilterComponent {
  // Sorties signal
  search = output<any>();
  reset = output<void>();

  // Entrée signal avec effet pour les mises à jour réactives
  initialFilters = input<any>(null);

  private fb = inject(FormBuilder);

  roles = Object.values(UserRole);

  form = this.fb.group({
    username: [''],
    email: [''],

    // Champ UI
    role: [''],

    isSuspended: [''] as ['' | true | false],

    createdAtAfter: [''],
    createdAtBefore: [''],
  });

  constructor() {
    // Effet pour gérer les changements de initialFilters (remplace le setter @Input)
    effect(() => {
      const f = this.initialFilters();
      if (!f) return;

      this.form.patchValue({
        username: f.username ?? '',
        email: f.email ?? '',
        role: f.role ?? '',

        // le parent reconstruira f.isSuspended en boolean/'' => OK
        isSuspended: f.isSuspended ?? '',

        createdAtAfter: f['createdAt[after]'] ?? '',
        createdAtBefore: f['createdAt[before]'] ?? '',
      }, { emitEvent: false });
    });
  }

  submit() {
    const v = this.form.value;

    const filters: any = {
      username: v.username ?? '',
      email: v.email ?? '',
      role: v.role ?? '', // on garde role pour l'URL
    };

    // Compatible URL : 'true'/'false' (si Tous => '')
    if (v.isSuspended !== '') {
      filters['isSuspended'] = String(v.isSuspended);
    }

    if (v.createdAtAfter) filters['createdAt[after]'] = v.createdAtAfter;
    if (v.createdAtBefore) filters['createdAt[before]'] = v.createdAtBefore;

    this.search.emit(filters);
  }

  resetFilters() {
    this.form.reset({
      username: '',
      email: '',
      role: '',
      isSuspended: '',
      createdAtAfter: '',
      createdAtBefore: '',
    });
    this.reset.emit();
  }

  setIsSuspended(value: '' | true | false) {
    this.form.controls.isSuspended.setValue(value);
  }
}
