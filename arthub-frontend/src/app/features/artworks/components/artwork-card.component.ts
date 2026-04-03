import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Artwork } from '../../../core/models/artwork.model';
import { environment } from '../../../environments/environment';
import { StarRatingComponent } from '../../../shared/components/star-rating.component/star-rating.component';
import { toSlugId } from '../../../shared/utils/slugify';

@Component({
  selector: 'app-artwork-card',
  standalone: true,
  imports: [CommonModule, RouterModule, StarRatingComponent],
  templateUrl: './artwork-card.component.html',
})
export class ArtworkCardComponent {
  artwork = input.required<Artwork>();

  imageUrl = computed(() => {
    const art = this.artwork();
    if (art.image?.contentUrl) {
      return environment.apiBaseUrl + art.image.contentUrl;
    }
    if (art.imageUrl) {
      return art.imageUrl;
    }
    return 'assets/default-image.svg';
  });

  averageRating = computed(() => {
    const art = this.artwork();
    if (!art.ratings || (art.ratings as any[]).length === 0) return 0;
    const ratings = art.ratings as any[];
    const sum = ratings.reduce((acc, r) => acc + (r.score || 0), 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  });

  ratingsCount = computed(() => {
    const art = this.artwork();
    return art.ratings ? (art.ratings as any[]).length : 0;
  });

  slugId = computed(() => {
    const art = this.artwork();
    return art.id && art.title ? toSlugId(art.id, art.title) : art.id;
  });
}
