import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss',
})
export class ConfirmModalComponent {
  @Input() title = '';
  @Input() itemTitle = ''; 
  @Input() message = 'Voulez-vous continuer ?';
  @Input() isOpen = false;

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  confirm() {
    this.isOpen = false;
    this.onConfirm.emit();
  }

  cancel() {
    this.isOpen = false;
    this.onCancel.emit();
  }
}
