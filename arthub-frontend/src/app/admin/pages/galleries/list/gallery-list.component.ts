import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { PaginatedResult } from '../../../../core/utils/hydra';
import { Gallery } from '../../../../core/models';
import { environment } from '../../../../environments/environment';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { DateDisplayPipe } from '../../../../shared/pipes/date-display.pipe';
import { GalleryFilterComponent } from '../filter/gallery-filter.component';
import { ResourceIdPipe } from '../../../../shared/pipes/resource-id.pipe';
import { ResourceLabelPipe } from '../../../../shared/pipes/resource-label.pipe';
import { RelatedEntitiesModalComponent, RelatedEntitiesData } from '../../../../shared/components/related-entities-modal.component/related-entities-modal.component';
import { ConstraintErrorHandlerService } from '../../../../core/services/constraint-error-handler.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-gallery-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DateDisplayPipe,
    ConfirmModalComponent,
    GalleryFilterComponent,
    ResourceIdPipe,
    ResourceLabelPipe,
    RelatedEntitiesModalComponent
  ],
  templateUrl: './gallery-list.component.html',
})
export class GalleryListComponent {
  private api = inject(ApiPlatformService<Gallery>);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private constraintErrorHandler = inject(ConstraintErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  galleries = signal<PaginatedResult<Gallery> | null>(null);
  loading = signal(false);

  confirmModalOpen = signal(false);
  galleryToDeleteId: number | null = null;
  selectedGalleryName = '';

  // Modal des entités liées
  relatedEntitiesModalOpen = signal(false);
  relatedEntitiesData: RelatedEntitiesData[] = [];
  relatedEntitiesTitle = '';
  relatedEntitiesMessage = '';

  page = signal(1);
  itemsPerPage = 20;

  // on ne garde plus ça "local-only", on le reconstruit depuis l'URL
  filters: any = {};

  galleriesWithImages = computed(() =>
    this.galleries()?.items.map(g => ({
      ...g,
      imageUrl: g.coverImage?.contentUrl
        ? environment.apiBaseUrl + g.coverImage.contentUrl
        : 'assets/default-image.png'
    })) || []
  );

  hasNextPage = computed(() => {
    const current = this.galleries();
    return current ? this.page() < (current.lastPage || 1) : false;
  });

  constructor() {
    // Source de verite = URL
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qp) => {
      const page = Number(qp.get('page') ?? '1');
      this.page.set(Number.isFinite(page) && page > 0 ? page : 1);

      // reconstruire les filtres depuis les query params
      const f: any = {};

      const name = qp.get('name');
      if (name) f.name = name;

      const isPublic = qp.get('isPublic');
      // isPublic = '' | 'true' | 'false' (string)
      if (isPublic === 'true') f.isPublic = true;
      else if (isPublic === 'false') f.isPublic = false;

      // dates API Platform : createdAt[after], etc.
      const cAfter = qp.get('createdAt[after]');
      const cBefore = qp.get('createdAt[before]');
      const uAfter = qp.get('updatedAt[after]');
      const uBefore = qp.get('updatedAt[before]');

      if (cAfter) f['createdAt[after]'] = cAfter;
      if (cBefore) f['createdAt[before]'] = cBefore;
      if (uAfter) f['updatedAt[after]'] = uAfter;
      if (uBefore) f['updatedAt[before]'] = uBefore;

      const owner = qp.get('owner'); // ex: /api/users/12
      if (owner) f.owner = owner;

      this.filters = f;

      // recharger à chaque changement d’URL
      this.fetchGalleries(this.page());
    });
  }

  fetchGalleries(page = 1) {
    const params = { page, itemsPerPage: this.itemsPerPage, ...this.filters };
    this.loading.set(true);

    this.api.list('galleries', page, this.itemsPerPage, params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.galleries.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Erreur lors du chargement des galeries', 'error');
      }
    });
  }

  // Met a jour l'URL (et donc declenche le rechargement via subscribe)
  private updateUrl(query: Record<string, any>) {
    // on enlève les valeurs vides / null / undefined pour une URL propre
    const cleaned: any = {};
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined || v === '') continue;
      cleaned[k] = v;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: cleaned,
      replaceUrl: true,
    });
  }

  setPage(page: number) {
    this.updateUrl({ ...this.route.snapshot.queryParams, page });
  }

  onSearch(filters: any) {
    // réinitialiser page = 1
    this.updateUrl({ ...filters, page: 1 });
  }

  onResetFilters() {
    this.updateUrl({ page: 1 }); // plus de filtres
  }

  // le reste est inchangé
  onPreview(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/preview/galleries', id]);
  }

  onViewDetails(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/galleries', id]);
  }

  onEdit(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/galleries/edit', id]);
  }

  onDelete(id?: number, name = '') {
    this.galleryToDeleteId = id ?? null;
    this.selectedGalleryName = name;
    this.confirmModalOpen.set(true);
  }

  handleConfirmDelete() {
    if (!this.galleryToDeleteId) return;

    this.api.delete('galleries', this.galleryToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.confirmModalOpen.set(false);
        this.fetchGalleries(this.page());
      },
      error: (e: any) => {
        console.error('Erreur suppression galerie:', e);
        this.confirmModalOpen.set(false);

        // Vérifier si c'est une erreur de contrainte
        const constraintInfo = this.constraintErrorHandler.isConstraintError(e);
        if (constraintInfo.isConstraintError && this.galleryToDeleteId) {
          // Charger les entités liées
          this.constraintErrorHandler.loadGalleryRelatedEntities(this.galleryToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (relatedData) => {
              if (relatedData.length > 0) {
                this.relatedEntitiesData = relatedData;
                this.relatedEntitiesTitle = 'Impossible de supprimer la galerie';
                this.relatedEntitiesMessage = `Cette galerie ne peut pas être supprimée car elle contient encore des œuvres. Veuillez d'abord retirer les œuvres suivantes :`;
                this.relatedEntitiesModalOpen.set(true);
              } else {
                this.toast.show('Erreur suppression', 'error');
              }
            },
            error: () => {
              alert('Erreur suppression');
            }
          });
        } else {
          alert('Erreur suppression');
        }
      }
    });
  }

  handleCancelDelete() {
    this.confirmModalOpen.set(false);
    this.galleryToDeleteId = null;
  }

  closeRelatedEntitiesModal() {
    this.relatedEntitiesModalOpen.set(false);
    this.relatedEntitiesData = [];
  }
}
