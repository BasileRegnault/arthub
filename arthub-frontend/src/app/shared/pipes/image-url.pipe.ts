import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Pipe pour construire l'URL complète d'une image depuis le contentUrl de l'API.
 * Retourne une image par défaut si contentUrl est vide/null.
 *
 * Usage : {{ artwork.image?.contentUrl | imageUrl }}
 *         {{ artist.profilePicture?.contentUrl | imageUrl:'assets/default-avatar.svg' }}
 */
@Pipe({
  name: 'imageUrl',
  standalone: true,
})
export class ImageUrlPipe implements PipeTransform {
  transform(contentUrl: string | null | undefined, fallback = 'assets/default-image.svg'): string {
    if (!contentUrl) return fallback;
    // URL externe (ex: IIIF Art Institute of Chicago) — retourner directement
    if (contentUrl.startsWith('http')) return contentUrl;
    return environment.apiBaseUrl + contentUrl;
  }
}
