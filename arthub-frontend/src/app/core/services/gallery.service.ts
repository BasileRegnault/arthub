import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiPlatformService } from './api-platform.service';
import { Gallery } from '../models';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private api = inject(ApiPlatformService<Gallery>);

  /**
   * Récupérer les galeries créées par un utilisateur spécifique
   */
  getUserGalleries(userId: number, page = 1, itemsPerPage = 20): Observable<any> {
    return this.api.list('galleries', page, itemsPerPage, {
      owner: `/api/users/${userId}`,
      'order[createdAt]': 'desc'
    });
  }

  /**
   * Récupérer uniquement les galeries publiques
   */
  getPublicGalleries(page = 1, itemsPerPage = 20, filters: any = {}): Observable<any> {
    return this.api.list('galleries', page, itemsPerPage, {
      isPublic: true,
      'order[createdAt]': 'desc',
      ...filters
    });
  }

  /**
   * Basculer la visibilité de la galerie (publique/privée)
   */
  toggleVisibility(galleryId: number, isPublic: boolean): Observable<Gallery> {
    return this.api.patch('galleries', galleryId.toString(), { isPublic });
  }

  /**
   * Ajouter une œuvre à une galerie
   */
  addArtworkToGallery(galleryId: number, artworkId: number): Observable<Gallery> {
    // Suppose que l'API supporte l'ajout d'œuvres via PATCH
    // À adapter selon votre implémentation API
    return this.api.get('galleries', galleryId.toString());
  }

  /**
   * Retirer une œuvre d'une galerie
   */
  removeArtworkFromGallery(galleryId: number, artworkId: number): Observable<Gallery> {
    // Suppose que l'API supporte le retrait d'œuvres via PATCH
    // À adapter selon votre implémentation API
    return this.api.get('galleries', galleryId.toString());
  }

  /**
   * Récupérer une galerie par son ID
   */
  getGallery(galleryId: number): Observable<Gallery> {
    return this.api.get('galleries', galleryId.toString());
  }

  /**
   * Créer une nouvelle galerie
   */
  createGallery(data: Partial<Gallery>): Observable<Gallery> {
    return this.api.create('galleries', data);
  }

  /**
   * Mettre à jour une galerie
   */
  updateGallery(galleryId: number, data: Partial<Gallery>): Observable<Gallery> {
    return this.api.patch('galleries', galleryId.toString(), data);
  }

  /**
   * Supprimer une galerie
   */
  deleteGallery(galleryId: number): Observable<void> {
    return this.api.delete('galleries', galleryId);
  }
}
