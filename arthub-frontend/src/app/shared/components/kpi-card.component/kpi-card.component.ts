import { Component, input } from '@angular/core';

/**
 * Carte KPI réutilisable pour le tableau de bord.
 * Affiche une icône, un libellé et une valeur.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <div class="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div class="p-3 rounded-lg" [class]="iconBgClass()">
        <ng-content></ng-content>
      </div>
      <div>
        <p class="text-sm text-gray-500">{{ label() }}</p>
        <p class="text-2xl font-bold">{{ value() }}</p>
      </div>
    </div>
  `,
})
export class KpiCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  iconBgClass = input('bg-blue-100 text-blue-600');
}
