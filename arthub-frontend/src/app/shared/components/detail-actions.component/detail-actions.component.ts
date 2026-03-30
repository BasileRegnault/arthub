import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiPlatformService } from '../../../core/services/api-platform.service';
import { ConfirmModalComponent } from '../confirm-modal.component/confirm-modal.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-detail-actions',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './detail-actions.component.html',
})
export class DetailActionsComponent {
  private router = inject(Router);
  private api = inject(ApiPlatformService<any>);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  // ===== REQUIS =====
  @Input({ required: true }) id!: number | null;
  @Input({ required: true }) resource!: string;

  // ===== LIENS =====
  @Input() editLink: any[] | null = null;
  @Input() previewLink: any[] | null = null;
  @Input() backLink: any[] | null = null;

  // ===== SUPPRESSION =====
  @Input() deleteTitle = 'Supprimer';
  @Input() itemTitle = '';

  // ===== VISIBILITE =====
  @Input() showEdit = true;
  @Input() showDelete = true;
  @Input() showPreview = false; // nouveau

  // ===== LIBELLES =====
  @Input() editLabel = 'Modifier';
  @Input() deleteLabel = 'Supprimer';
  @Input() previewLabel = 'Prévisualiser'; // nouveau

  // ===== STYLES =====
  @Input() editClass =
    'px-3 py-2 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-700 disabled:opacity-50';
  @Input() deleteClass =
    'px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50';
  @Input() previewClass =
    'px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50';

  // ===== EVENEMENTS =====
  @Output() deleted = new EventEmitter<number>();

  confirmOpen = signal(false);

  get disabled(): boolean {
    return !this.id;
  }

  // ===== ACTIONS =====
  onEdit(): void {
    if (this.disabled) return;

    if (this.editLink?.length) {
      this.router.navigate(this.editLink);
    } else {
      this.router.navigate(['/admin', this.resource, 'edit', this.id]);
    }
  }

  onPreview(): void {
    if (this.disabled || !this.previewLink?.length) return;
    this.router.navigate(this.previewLink);
  }

  onDelete(): void {
    if (this.disabled) return;
    this.confirmOpen.set(true);
  }

  handleConfirm(): void {
    if (this.disabled) return;

    this.api.delete(this.resource, Number(this.id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.confirmOpen.set(false);
        this.deleted.emit(Number(this.id));

        if (this.backLink?.length) {
          this.router.navigate(this.backLink);
        } else {
          this.router.navigate(['/admin', this.resource]);
        }
      },
      error: () => {
        this.confirmOpen.set(false);
        this.toast.show('Erreur lors de la suppression.', 'error');
      },
    });
  }

  handleCancel(): void {
    this.confirmOpen.set(false);
  }
}
