import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Gallery } from '../../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gallery-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gallery-card.component.html',
})
export class GalleryCardComponent {
  gallery = input.required<Gallery>();
  showActions = input<boolean>(false);

  edit = output<number>();
  delete = output<number>();
  toggleVisibility = output<number>();

  coverImageUrl = computed(() => {
    const g = this.gallery();
    return g.coverImage?.contentUrl
      ? environment.apiBaseUrl + g.coverImage.contentUrl
      : 'assets/default-gallery.png';
  });

  artworksCount = computed(() => {
    const g = this.gallery();
    return g.artworks ? (g.artworks as any[]).length : 0;
  });

  onEdit(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const id = this.gallery().id;
    if (id) this.edit.emit(id);
  }

  onDelete(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const id = this.gallery().id;
    if (id) this.delete.emit(id);
  }

  onToggleVisibility(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const id = this.gallery().id;
    if (id) this.toggleVisibility.emit(id);
  }
}
