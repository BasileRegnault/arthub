import { Component, EventEmitter, Input, Output, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface RelatedEntity {
  id: number;
  label: string;  // Le nom/titre de l'entité
  route: string;  // Le lien vers l'entité (ex: /admin/artworks/123)
  additionalInfo?: string;  // Info supplémentaire (ex: date, type, etc.)
}

export interface RelatedEntitiesData {
  entityType: string;  // Type d'entité liée (ex: "Œuvres", "Galeries")
  entities: RelatedEntity[];
}

@Component({
  selector: 'app-related-entities-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './related-entities-modal.component.html',
})
export class RelatedEntitiesModalComponent {
  @Input() isOpen!: Signal<boolean>;
  @Input() title = '';
  @Input() message = '';
  @Input() relatedData: RelatedEntitiesData[] = [];

  @Output() onClose = new EventEmitter<void>();

  close() {
    this.onClose.emit();
  }

  // Empêcher la propagation du clic sur le contenu de la modal
  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
