import { Component, input, output } from '@angular/core';

/**
 * Composant de bascule booléenne à 3 états : Tous / Vrai / Faux.
 * Utilisé dans les filtres admin pour les champs booléens.
 */
@Component({
  selector: 'app-boolean-toggle',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 mt-2">
      <span class="text-sm font-medium text-gray-700">{{ label() }} :</span>
      <div class="flex rounded-lg border overflow-hidden shadow-sm">
        <button type="button"
                class="px-3 py-2 text-sm sm:px-4 sm:py-2"
                [class.bg-gray-100]="value() === ''"
                (click)="valueChange.emit('')">
          {{ allLabel() }}
        </button>
        <button type="button"
                class="px-3 py-2 text-sm sm:px-4 sm:py-2"
                [class.bg-green-500]="value() === true"
                [class.text-white]="value() === true"
                (click)="valueChange.emit(true)">
          {{ trueLabel() }}
        </button>
        <button type="button"
                class="px-3 py-2 text-sm sm:px-4 sm:py-2"
                [class.bg-red-500]="value() === false"
                [class.text-white]="value() === false"
                (click)="valueChange.emit(false)">
          {{ falseLabel() }}
        </button>
      </div>
    </div>
  `,
})
export class BooleanToggleComponent {
  label = input.required<string>();
  value = input.required<'' | true | false>();
  allLabel = input('Tous');
  trueLabel = input.required<string>();
  falseLabel = input.required<string>();
  valueChange = output<'' | true | false>();
}
