import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Artwork } from '../../../../core/models';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaginatedResult } from '../../../../core/utils/hydra';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { DateDisplayPipe } from "../../../../shared/pipes/date-display.pipe";
import { ArtworksFilterComponent } from "../filter/artworks-filter.component";
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { ResourceIdPipe } from '../../../../shared/pipes/resource-id.pipe';
import { ResourceLabelPipe } from '../../../../shared/pipes/resource-label.pipe';
import { RelatedEntitiesModalComponent, RelatedEntitiesData } from '../../../../shared/components/related-entities-modal.component/related-entities-modal.component';
import { ConstraintErrorHandlerService } from '../../../../core/services/constraint-error-handler.service';
import { PaginationComponent } from '../../../../shared/components/pagination.component/pagination.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-list.component',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DateDisplayPipe,
    ArtworksFilterComponent,
    ConfirmModalComponent,
    ResourceIdPipe,
    ResourceLabelPipe,
    RelatedEntitiesModalComponent,
    PaginationComponent
  ],
  templateUrl: './artwork-list.component.html',
  styleUrl: './artwork-list.component.scss',
})
export class ArtworkListComponent {
  private api = inject(ApiPlatformService<Artwork>);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private constraintErrorHandler = inject(ConstraintErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  confirmModalOpen = signal(false);
  artworkToDeleteId: number | null = null;
  selectedArtworkTitle = '';

  // Modal des entités liées
  relatedEntitiesModalOpen = signal(false);
  relatedEntitiesData: RelatedEntitiesData[] = [];
  relatedEntitiesTitle = '';
  relatedEntitiesMessage = '';

  artworks = signal<PaginatedResult<Artwork> | null>(null);
  loading = signal(false);

  page = signal(1);
  itemsPerPage = 20;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filtres pilotés par URL
  filters: any = {};

  artworksWithImages = computed(() =>
    this.artworks()?.items.map(a => ({
      ...a,
      imageUrl: a.image?.contentUrl ? environment.apiBaseUrl + a.image.contentUrl : (a.imageUrl ?? 'assets/default-image.svg')
    })) || []
  );

  hasNextPage = computed(() => {
    const current = this.artworks();
    return current ? this.page() < (current.lastPage || 1) : false;
  });

  constructor() {
    // Ecoute l'URL, reconstruit page + filtres, puis charge les donnees
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(qp => {
      const page = Number(qp.get('page') ?? '1');
      this.page.set(Number.isFinite(page) && page > 0 ? page : 1);

      const f: any = {};

      const title = qp.get('title');
      if (title) f.title = title;

      const type = qp.get('type');
      if (type) f.type = type;

      const style = qp.get('style');
      if (style) f.style = style;

      const location = qp.get('location');
      if (location) f.location = location;

      // isDisplay (URL: 'true' | 'false')
      const isDisplay = qp.get('isDisplay');
      if (isDisplay === 'true') f.isDisplay = true;
      else if (isDisplay === 'false') f.isDisplay = false;

      // artist + createdBy (IRI API Platform)
      const artist = qp.get('artist');       // ex /api/artists/34
      const createdBy = qp.get('createdBy'); // ex /api/users/12
      if (artist) f.artist = artist;
      if (createdBy) f.createdBy = createdBy;

      // dates au format API Platform
      const creationAfter = qp.get('creationDate[after]');
      const creationBefore = qp.get('creationDate[before]');
      const createdAfter = qp.get('createdAt[after]');
      const createdBefore = qp.get('createdAt[before]');

      if (creationAfter) f['creationDate[after]'] = creationAfter;
      if (creationBefore) f['creationDate[before]'] = creationBefore;
      if (createdAfter) f['createdAt[after]'] = createdAfter;
      if (createdBefore) f['createdAt[before]'] = createdBefore;

      this.filters = f;

      // rechargement
      this.fetchArtworks(this.page());
    });
  }

  fetchArtworks(page = 1) {
    const params = { page, itemsPerPage: this.itemsPerPage, ...this.filters };
    this.loading.set(true);

    this.api.list('artworks', page, this.itemsPerPage, params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: PaginatedResult<Artwork>) => {
        this.artworks.set({
          items: res.items,
          total: res.total,
          page: res.page,
          lastPage: res.lastPage,
          itemsPerPage: this.itemsPerPage
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Erreur lors du chargement des œuvres.', 'error');
      }
    });
  }

  private updateUrl(query: Record<string, any>) {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined || v === '') continue;
      cleaned[k] = v;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: cleaned,
    });
  }

  setPage(newPage: number) {
    this.updateUrl({ ...this.route.snapshot.queryParams, page: newPage });
  }

  onSearch(filters: any) {
    this.updateUrl({ ...filters, page: 1 });
  }

  onResetFilters() {
    this.updateUrl({ page: 1 });
  }

  // Tri (local)
  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const current = this.artworks();
    if (!current) return;

    const sortedItems = [...current.items].sort((a, b) => {
      const aVal = a[column as keyof Artwork] ?? '';
      const bVal = b[column as keyof Artwork] ?? '';
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.artworks.set({ ...current, items: sortedItems, page: current.page ?? this.page() });
  }

  getAverageRating(art: Artwork): string {
    if (!art.ratings || (art.ratings as any[]).length === 0) return '—';
    const ratings = art.ratings as any[];
    const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
    return avg.toFixed(1);
  }

  onEdit(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/artworks/edit', id]);
  }

  onViewDetails(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/artworks', id]);
  }

  onPreview(id?: number) {
    if (!id) return;
    window.open(`/artworks/${id}`, '_blank');
  }

  onDelete(id?: number, title: string = '') {
    this.artworkToDeleteId = id ?? null;
    this.selectedArtworkTitle = title ?? '';
    this.confirmModalOpen.set(true);
  }

  handleConfirmDelete() {
    if (!this.artworkToDeleteId) return;

    this.api.delete('artworks', this.artworkToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.confirmModalOpen.set(false);
        this.fetchArtworks(this.page());
        this.artworkToDeleteId = null;
      },
      error: (e: any) => {
        console.error('Erreur suppression œuvre:', e);
        this.confirmModalOpen.set(false);

        // Vérifier si c'est une erreur de contrainte
        const constraintInfo = this.constraintErrorHandler.isConstraintError(e);
        if (constraintInfo.isConstraintError && this.artworkToDeleteId) {
          // Charger les entités liées
          this.constraintErrorHandler.loadArtworkRelatedEntities(this.artworkToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (relatedData) => {
              if (relatedData.length > 0) {
                this.relatedEntitiesData = relatedData;
                this.relatedEntitiesTitle = 'Impossible de supprimer l\'œuvre';
                this.relatedEntitiesMessage = `Cette œuvre ne peut pas être supprimée car elle est liée à d'autres entités. Veuillez d'abord supprimer ou modifier les entités suivantes :`;
                this.relatedEntitiesModalOpen.set(true);
              } else {
                this.toast.show('Erreur lors de la suppression.', 'error');
              }
            },
            error: () => {
              this.toast.show('Erreur lors de la suppression.', 'error');
            }
          });
        } else {
          this.toast.show('Erreur lors de la suppression.', 'error');
        }
      }
    });
  }

  handleCancelDelete() {
    this.artworkToDeleteId = null;
    this.confirmModalOpen.set(false);
  }

  closeRelatedEntitiesModal() {
    this.relatedEntitiesModalOpen.set(false);
    this.relatedEntitiesData = [];
  }
}
