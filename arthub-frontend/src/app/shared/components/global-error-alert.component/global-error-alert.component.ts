import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Composant réutilisable pour afficher une alerte d'erreur globale
 */
@Component({
  selector: 'app-global-error-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-error-alert.component.html',
  styleUrls: ['./global-error-alert.component.scss']
})
export class GlobalErrorAlertComponent {
  @Input() error: string | null = null;
  @Input() title: string = 'Erreur';
  @Input() dismissible: boolean = true;
  @Output() dismiss = new EventEmitter<void>();

  onDismiss() {
    this.dismiss.emit();
  }
}
