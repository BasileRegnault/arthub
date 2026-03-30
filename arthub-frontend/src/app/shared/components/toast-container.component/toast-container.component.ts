import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 flex flex-col gap-3 z-50">
      <div *ngFor="let t of toastService.toasts()"
           [@toastAnimation]
           [ngClass]="t.type === 'error' 
                      ? 'bg-red-100 text-red-700 border-red-400' 
                      : 'bg-green-100 text-green-700 border-green-400'"
           class="border px-4 py-3 rounded shadow-lg flex items-center justify-between min-w-[250px]">
        <span>{{ t.message }}</span>
        <button (click)="toastService.dismiss(t.id)" class="ml-4 font-bold">&times;</button>
      </div>
    </div>
  `,
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' })),
      ]),
    ]),
  ],
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
