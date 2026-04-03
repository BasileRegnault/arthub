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
    if (g.coverImage?.contentUrl) return environment.apiBaseUrl + g.coverImage.contentUrl;
    // Utiliser la première œuvre comme image de couverture
    const artworks = g.artworks as any[];
    if (artworks?.length > 0 && typeof artworks[0] === 'object') {
      const first = artworks[0];
      if (first.image?.contentUrl) return environment.apiBaseUrl + first.image.contentUrl;
      if (first.imageUrl) return first.imageUrl;
    }
    return 'assets/default-gallery.svg';
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
