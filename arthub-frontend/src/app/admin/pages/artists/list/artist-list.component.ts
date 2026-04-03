import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Artist } from '../../../../core/models';
import { PaginatedResult } from '../../../../core/utils/hydra';
import { ArtistsFilterComponent } from '../filter/artist-filter.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { environment } from '../../../../environments/environment';
import { DateDisplayPipe } from '../../../../shared/pipes/date-display.pipe';
import { ResourceLabelPipe } from '../../../../shared/pipes/resource-label.pipe';
import { ResourceIdPipe } from '../../../../shared/pipes/resource-id.pipe';
import { RelatedEntitiesModalComponent, RelatedEntitiesData } from '../../../../shared/components/related-entities-modal.component/related-entities-modal.component';
import { ConstraintErrorHandlerService } from '../../../../core/services/constraint-error-handler.service';
import { PaginationComponent } from '../../../../shared/components/pagination.component/pagination.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-artist-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DateDisplayPipe,
    ArtistsFilterComponent,
    ConfirmModalComponent,
    ResourceIdPipe,
    ResourceLabelPipe,
    RelatedEntitiesModalComponent,
    PaginationComponent
  ],
  templateUrl: './artist-list.component.html',
})
export class ArtistListComponent {
  private api = inject(ApiPlatformService<Artist>);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private constraintErrorHandler = inject(ConstraintErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  confirmModalOpen = signal(false);
  artistToDeleteId: number | null = null;
  selectedArtistName = '';

  // Modal des entités liées
  relatedEntitiesModalOpen = signal(false);
  relatedEntitiesData: RelatedEntitiesData[] = [];
  relatedEntitiesTitle = '';
  relatedEntitiesMessage = '';

  artists = signal<PaginatedResult<Artist> | null>(null);
  loading = signal(false);

  page = signal(1);
  itemsPerPage = 20;

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filtres pilotés par URL
  filters: any = {};

  constructor() {
    // Ecoute l'URL et recharge automatiquement
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(qp => {
      const page = Number(qp.get('page') ?? '1');
      this.page.set(Number.isFinite(page) && page > 0 ? page : 1);

      const f: any = {};

      const firstname = qp.get('firstname');
      if (firstname) f.firstname = firstname;

      const lastname = qp.get('lastname');
      if (lastname) f.lastname = lastname;

      const nationality = qp.get('nationality');
      if (nationality) f.nationality = nationality;

      // booléen dans URL: 'true' | 'false'
      const isConfirmCreate = qp.get('isConfirmCreate');
      if (isConfirmCreate === 'true') f.isConfirmCreate = true;
      else if (isConfirmCreate === 'false') f.isConfirmCreate = false;

      // dates au format API Platform
      const bornAfter = qp.get('bornAt[after]');
      const bornBefore = qp.get('bornAt[before]');
      const diedAfter = qp.get('diedAt[after]');
      const diedBefore = qp.get('diedAt[before]');
      const createdAfter = qp.get('createdAt[after]');
      const createdBefore = qp.get('createdAt[before]');
      const updatedAfter = qp.get('updatedAt[after]');
      const updatedBefore = qp.get('updatedAt[before]');

      if (bornAfter) f['bornAt[after]'] = bornAfter;
      if (bornBefore) f['bornAt[before]'] = bornBefore;
      if (diedAfter) f['diedAt[after]'] = diedAfter;
      if (diedBefore) f['diedAt[before]'] = diedBefore;
      if (createdAfter) f['createdAt[after]'] = createdAfter;
      if (createdBefore) f['createdAt[before]'] = createdBefore;
      if (updatedAfter) f['updatedAt[after]'] = updatedAfter;
      if (updatedBefore) f['updatedAt[before]'] = updatedBefore;

      // createdBy = IRI API Platform
      const createdBy = qp.get('createdBy'); // ex: /api/users/12
      if (createdBy) f.createdBy = createdBy;

      this.filters = f;

      // rechargement
      this.fetchArtists(this.page());
    });
  }

  fetchArtists(page = 1) {
    const params = { page, itemsPerPage: this.itemsPerPage, ...this.filters };
    this.loading.set(true);
    this.api.list('artists', page, this.itemsPerPage, params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.artists.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
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
    // réinitialiser la page
    this.updateUrl({ ...filters, page: 1 });
  }

  onResetFilters() {
    this.updateUrl({ page: 1 });
  }

  onEdit(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/artists/edit', id]);
  }

  onDelete(id?: number, name = '') {
    this.artistToDeleteId = id ?? null;
    this.selectedArtistName = name;
    this.confirmModalOpen.set(true);
  }

  onViewDetails(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/artists', id]);
  }

  onPreview(id?: number) {
    if (!id) return;
    window.open(`/artists/${id}`, '_blank');
  }

  // Tri (local sur la page)
  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const current = this.artists();
    if (!current) return;

    const sortedItems = [...current.items].sort((a, b) => {
      const aVal = a[column as keyof Artist] ?? '';
      const bVal = b[column as keyof Artist] ?? '';
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.artists.set({ ...current, items: sortedItems, page: current.page ?? this.page() });
  }

  handleConfirmDelete() {
    if (!this.artistToDeleteId) return;
    this.api.delete('artists', this.artistToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.confirmModalOpen.set(false);
        this.fetchArtists(this.page());
      },
      error: (e: any) => {
        console.error('Erreur suppression artiste:', e);
        this.confirmModalOpen.set(false);

        // Vérifier si c'est une erreur de contrainte
        const constraintInfo = this.constraintErrorHandler.isConstraintError(e);
        if (constraintInfo.isConstraintError && this.artistToDeleteId) {
          // Charger les entités liées
          this.constraintErrorHandler.loadArtistRelatedEntities(this.artistToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (relatedData) => {
              if (relatedData.length > 0) {
                this.relatedEntitiesData = relatedData;
                this.relatedEntitiesTitle = 'Impossible de supprimer l\'artiste';
                this.relatedEntitiesMessage = `Cet artiste ne peut pas être supprimé car il est lié à d'autres entités. Veuillez d'abord supprimer ou modifier les entités suivantes :`;
                this.relatedEntitiesModalOpen.set(true);
              } else {
                this.toast.show('Erreur lors de la suppression.', 'error');
              }
            },
            error: () => {
              alert('Erreur lors de la suppression.');
            }
          });
        } else {
          alert('Erreur lors de la suppression.');
        }
      }
    });
  }

  handleCancelDelete() {
    this.artistToDeleteId = null;
    this.confirmModalOpen.set(false);
  }

  closeRelatedEntitiesModal() {
    this.relatedEntitiesModalOpen.set(false);
    this.relatedEntitiesData = [];
  }

  artistsWithProfilePictures = computed(() =>
    this.artists()?.items.map(a => ({
      ...a,
      profilePictureUrl: a.profilePicture?.contentUrl
        ? environment.apiBaseUrl + a.profilePicture.contentUrl
        : 'assets/default-image.svg'
    })) || []
  );

  hasNextPage = computed(() => this.page() < (this.artists()?.lastPage || 1));
}
