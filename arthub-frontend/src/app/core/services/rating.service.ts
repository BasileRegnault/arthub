import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiPlatformService } from './api-platform.service';

export interface RatingDto {
  '@id'?: string;
  id?: number;
  score: number;
  comment?: string | null;
  artwork: string; // IRI
  createdBy?: any;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private api = inject(ApiPlatformService<RatingDto>);

  /**
   * Créer une note pour une œuvre
   */
  rateArtwork(artworkId: number, score: number, comment?: string): Observable<RatingDto> {
    const payload: Partial<RatingDto> = {
      score,
      comment: comment || null,
      artwork: `/api/artworks/${artworkId}`
    };
    return this.api.create('ratings', payload);
  }

  /**
   * Récupérer la note de l'utilisateur pour une œuvre spécifique
   */
  getUserRating(artworkId: number): Observable<any> {
    // API Platform filter: /api/ratings?artwork=/api/artworks/{id}
    return this.api.list('ratings', 1, 1, {
      artwork: `/api/artworks/${artworkId}`
    });
  }

  /**
   * Mettre à jour une note existante
   */
  updateRating(ratingId: number, score: number, comment?: string): Observable<RatingDto> {
    const payload: Partial<RatingDto> = {
      score,
      comment: comment || null
    };
    return this.api.patch('ratings', ratingId.toString(), payload);
  }

  /**
   * Supprimer une note
   */
  deleteRating(ratingId: number): Observable<void> {
    return this.api.delete('ratings', ratingId);
  }

  /**
   * Récupérer toutes les notes d'une œuvre
   */
  getArtworkRatings(artworkId: number, page = 1, itemsPerPage = 10): Observable<any> {
    return this.api.list('ratings', page, itemsPerPage, {
      artwork: `/api/artworks/${artworkId}`,
      'order[createdAt]': 'desc'
    });
  }

  /**
   * Récupérer les notes d'un utilisateur
   */
  getUserRatings(userId: number, page = 1, itemsPerPage = 20): Observable<any> {
    return this.api.list('ratings', page, itemsPerPage, {
      createdBy: `/api/users/${userId}`,
      'order[createdAt]': 'desc'
    });
  }
}
