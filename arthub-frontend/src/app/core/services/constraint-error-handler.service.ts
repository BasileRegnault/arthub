import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiPlatformService } from './api-platform.service';
import { RelatedEntitiesData, RelatedEntity } from '../../shared/components/related-entities-modal.component/related-entities-modal.component';

export interface ConstraintErrorInfo {
  isConstraintError: boolean;
  entityType: 'artist' | 'artwork' | 'user' | 'gallery' | null;
  entityId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConstraintErrorHandlerService {
  private api = inject(ApiPlatformService);

  /**
   * Vérifie si une erreur est une erreur de contrainte de clé étrangère
   */
  isConstraintError(error: any): ConstraintErrorInfo {
    const result: ConstraintErrorInfo = {
      isConstraintError: false,
      entityType: null,
      entityId: null
    };

    // Vérifier le statut HTTP (500 ou 409)
    if (!error || (error.status !== 500 && error.status !== 409)) {
      return result;
    }

    // Vérifier le message d'erreur
    const errorMessage = error?.error?.['hydra:description'] || error?.error?.message || error?.message || '';
    const lowerMessage = errorMessage.toLowerCase();

    // Mots-clés indiquant une contrainte de clé étrangère
    const constraintKeywords = [
      'foreign key',
      'constraint',
      'integrity constraint',
      'cannot delete',
      'violates foreign key',
      'referenced by',
      'still referenced'
    ];

    const hasConstraintKeyword = constraintKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    if (hasConstraintKeyword) {
      result.isConstraintError = true;
    }

    return result;
  }

  /**
   * Charge les entités liées pour un artiste
   */
  loadArtistRelatedEntities(artistId: number): Observable<RelatedEntitiesData[]> {
    return this.api.list('artworks', 1, 100, { 'artist.id': artistId }).pipe(
      map(res => {
        const relatedData: RelatedEntitiesData[] = [];

        if (res.items.length > 0) {
          relatedData.push({
            entityType: 'Œuvres',
            entities: res.items.map((artwork: any) => ({
              id: artwork.id,
              label: artwork.title || `Œuvre #${artwork.id}`,
              route: `/admin/artworks/${artwork.id}`,
              additionalInfo: artwork.type || ''
            }))
          });
        }

        return relatedData;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Charge les entités liées pour une œuvre
   */
  loadArtworkRelatedEntities(artworkId: number): Observable<RelatedEntitiesData[]> {
    return this.api.list('galleries', 1, 100).pipe(
      map(res => {
        const relatedData: RelatedEntitiesData[] = [];

        // Filtrer les galeries qui contiennent cette œuvre
        const galleriesWithArtwork = res.items.filter((gallery: any) => {
          if (!gallery.artworks) return false;

          // Si artworks est un tableau d'IRIs
          if (Array.isArray(gallery.artworks)) {
            return gallery.artworks.some((iri: string) =>
              iri.includes(`/artworks/${artworkId}`)
            );
          }

          return false;
        });

        if (galleriesWithArtwork.length > 0) {
          relatedData.push({
            entityType: 'Galeries',
            entities: galleriesWithArtwork.map((gallery: any) => ({
              id: gallery.id,
              label: gallery.name || `Galerie #${gallery.id}`,
              route: `/admin/galleries/${gallery.id}`,
              additionalInfo: gallery.description ? gallery.description.substring(0, 50) + '...' : ''
            }))
          });
        }

        return relatedData;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Charge les entités liées pour un utilisateur
   */
  loadUserRelatedEntities(userId: number): Observable<RelatedEntitiesData[]> {
    // Charger les galeries et les ratings de l'utilisateur
    const galleries$ = this.api.list('galleries', 1, 100, { 'createdBy.id': userId }).pipe(
      catchError(() => of({ items: [] }))
    );

    const ratings$ = this.api.list('ratings', 1, 100, { 'user.id': userId }).pipe(
      catchError(() => of({ items: [] }))
    );

    return forkJoin({
      galleries: galleries$,
      ratings: ratings$
    }).pipe(
      map(({ galleries, ratings }) => {
        const relatedData: RelatedEntitiesData[] = [];

        if (galleries.items.length > 0) {
          relatedData.push({
            entityType: 'Galeries créées',
            entities: galleries.items.map((gallery: any) => ({
              id: gallery.id,
              label: gallery.name || `Galerie #${gallery.id}`,
              route: `/admin/galleries/${gallery.id}`,
              additionalInfo: ''
            }))
          });
        }

        if (ratings.items.length > 0) {
          relatedData.push({
            entityType: 'Évaluations',
            entities: ratings.items.map((rating: any) => ({
              id: rating.id,
              label: `Note: ${rating.rating}/5`,
              route: `/admin/artworks/${this.extractIdFromIri(rating.artwork)}`,
              additionalInfo: rating.comment || ''
            }))
          });
        }

        return relatedData;
      })
    );
  }

  /**
   * Charge les entités liées pour une galerie
   */
  loadGalleryRelatedEntities(galleryId: number): Observable<RelatedEntitiesData[]> {
    return this.api.get('galleries', galleryId).pipe(
      map((gallery: any) => {
        const relatedData: RelatedEntitiesData[] = [];

        // Si la galerie a des œuvres
        if (gallery.artworks && Array.isArray(gallery.artworks) && gallery.artworks.length > 0) {
          // Note: ici on a juste les IRIs, il faudrait charger les détails
          // Pour simplifier, on va juste extraire les IDs
          relatedData.push({
            entityType: 'Œuvres',
            entities: gallery.artworks.map((iri: string) => {
              const id = this.extractIdFromIri(iri);
              return {
                id: id,
                label: `Œuvre #${id}`,
                route: `/admin/artworks/${id}`,
                additionalInfo: ''
              };
            })
          });
        }

        return relatedData;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Extrait l'ID d'une IRI API Platform
   */
  private extractIdFromIri(iri: string): number {
    const match = iri.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
