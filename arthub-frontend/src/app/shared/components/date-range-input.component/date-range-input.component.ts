import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Composant de saisie de plage de dates (Du / Au).
 * Accepte un FormGroup parent et les noms des champs "après" et "avant".
 */
@Component({
  selector: 'app-date-range-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex flex-col gap-1" [formGroup]="formGroup()">
      <label class="text-sm font-medium text-gray-700">{{ label() }}</label>
      <div class="flex gap-2">
        <input
          type="date"
          placeholder="Du"
          [formControlName]="afterControl()"
          class="border border-gray-300 rounded-lg px-3 py-2 w-full"
        />
        <input
          type="date"
          placeholder="Au"
          [formControlName]="beforeControl()"
          class="border border-gray-300 rounded-lg px-3 py-2 w-full"
        />
      </div>
    </div>
  `,
})
export class DateRangeInputComponent {
  label = input.required<string>();
  formGroup = input.required<FormGroup>();
  afterControl = input.required<string>();
  beforeControl = input.required<string>();
}
