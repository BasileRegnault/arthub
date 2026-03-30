import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-validation-reason-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './validation-reason-modal.component.html',
})
export class ValidationReasonModalComponent {
  @Input() open = false;

  @Input() title = 'Validation';
  @Input() subtitle: string | null = null;

  @Input() placeholder = 'Ex: sources vérifiées, informations cohérentes...';
  @Input() confirmLabel = 'Confirmer';
  @Input() confirmClass = 'bg-blue-600 hover:bg-blue-700';

  @Input() loading = false;

  @Input() maxLength = 255;

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<string | null>();

  reason = '';

  cancel() {
    this.reason = '';
    this.closed.emit();
  }

  confirm() {
    const v = (this.reason ?? '').trim().slice(0, this.maxLength);
    this.reason = '';
    this.submitted.emit(v.length ? v : null);
  }
}
