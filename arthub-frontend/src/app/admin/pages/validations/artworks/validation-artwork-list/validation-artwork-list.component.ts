import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiPlatformService } from '../../../../../core/services/api-platform.service';
import { Artwork } from '../../../../../core/models';
import { PaginatedResult } from '../../../../../core/utils/hydra';
import { DateDisplayPipe } from '../../../../../shared/pipes/date-display.pipe';
import { environment } from '../../../../../environments/environment';
import { forkJoin } from 'rxjs';
import { ValidationReasonModalComponent } from '../../../../../shared/components/alidation-reason-modal/validation-reason-modal.component';
import { ValidationRefreshService } from '../../../../../core/services/validation-refresh.service';

type ValidationStatus = 'approved' | 'rejected';

@Component({
  selector: 'app-validation-artwork-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DateDisplayPipe, ValidationReasonModalComponent],
  templateUrl: './validation-artwork-list.component.html',
})
export class ValidationArtworkListComponent {
  private api = inject(ApiPlatformService<any>);
  private router = inject(Router);
  private refreshBus = inject(ValidationRefreshService);
  private destroyRef = inject(DestroyRef);

  artworks = signal<PaginatedResult<Artwork> | null>(null);
  loading = signal(false);

  page = signal(1);
  itemsPerPage = 10;

  selectedIds = signal<Set<number>>(new Set());
  expandedDescription = signal<Set<number>>(new Set());

  modalOpen = signal(false);
  modalTitle = signal('Validation');
  modalSubtitle = signal<string | null>(null);
  modalConfirmLabel = signal('Confirmer');
  modalConfirmClass = signal('bg-blue-600 hover:bg-blue-700');
  modalLoading = signal(false);

  private pendingAction: null | {
    kind: 'single' | 'bulk';
    status: ValidationStatus;
    id?: number;
  } = null;

  artworksWithImages = computed(() =>
    this.artworks()?.items.map(a => ({
      ...a,
      imageUrl: (a as any)?.image?.contentUrl
        ? environment.apiBaseUrl + (a as any).image.contentUrl
        : ((a as any).imageUrl ?? 'assets/default-image.svg')
    })) || []
  );

  hasNextPage = computed(() => {
    const current = this.artworks();
    return current ? this.page() < (current.lastPage || 1) : false;
  });

  allSelectedOnPage = computed(() => {
    const items = this.artworks()?.items ?? [];
    if (!items.length) return false;
    const set = this.selectedIds();
    return items.every(a => (a as any).id && set.has((a as any).id));
  });

  constructor() {
    this.load();
  }

  load() {
    this.fetchArtworks(this.page());
  }

  fetchArtworks(page = 1) {
    this.loading.set(true);

    this.api.list('artworks', page, this.itemsPerPage, {
      isConfirmCreate: false,
      toBeConfirmed: true,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.artworks.set(res);
        this.loading.set(false);
        this.selectedIds.set(new Set());
      },
      error: () => this.loading.set(false)
    });
  }

  setPage(page: number) {
    this.page.set(page);
    this.load();
  }

  onEdit(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/artworks/edit', id]);
  }

  onPreview(id?: number) {
    if (!id) return;
    window.open(`/artworks/${id}`, '_blank');
  }

  toggleSelection(id?: number) {
    if (!id) return;
    const set = new Set(this.selectedIds());
    set.has(id) ? set.delete(id) : set.add(id);
    this.selectedIds.set(set);
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const set = new Set<number>();

    if (checked) {
      this.artworks()?.items.forEach((a: any) => a.id && set.add(a.id));
    }

    this.selectedIds.set(set);
  }

  toggleDescription(id?: number) {
    if (!id) return;
    const set = new Set(this.expandedDescription());
    set.has(id) ? set.delete(id) : set.add(id);
    this.expandedDescription.set(set);
  }

  openValidateModal(status: ValidationStatus, id?: number) {
    if (!id) return;

    this.pendingAction = { kind: 'single', status, id };

    const isReject = status === 'rejected';
    this.modalTitle.set(isReject ? 'Refuser l’œuvre' : 'Valider l’œuvre');
    this.modalSubtitle.set(isReject ? 'Tu peux ajouter une raison (optionnel).' : 'Tu peux ajouter un message (optionnel).');
    this.modalConfirmLabel.set(isReject ? 'Refuser' : 'Valider');
    this.modalConfirmClass.set(isReject ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700');

    this.modalOpen.set(true);
  }

  openBulkValidateModal() {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;

    this.pendingAction = { kind: 'bulk', status: 'approved' };

    this.modalTitle.set('Valider la sélection');
    this.modalSubtitle.set(`Tu vas valider ${ids.length} œuvre(s). Message optionnel pour tout le lot.`);
    this.modalConfirmLabel.set('Valider');
    this.modalConfirmClass.set('bg-green-600 hover:bg-green-700');

    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
    this.pendingAction = null;
  }

  submitModal(reason: string | null) {
    const action = this.pendingAction;
    if (!action) return;

    this.modalLoading.set(true);

    if (action.kind === 'single') {
      const id = action.id!;
      this.api.post('admin/validate/artwork', id, {
        status: action.status,
        reason
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.modalLoading.set(false);
          this.modalOpen.set(false);
          this.pendingAction = null;

          this.refreshBus.notify(); // recharge l'historique
          this.load();              // recharge les en attente
        },
        error: () => this.modalLoading.set(false)
      });
      return;
    }

    const ids = Array.from(this.selectedIds());

    forkJoin(
      ids.map(id =>
        this.api.post('admin/validate/artwork', id, {
          status: 'approved',
          reason
        })
      )
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.modalOpen.set(false);
        this.pendingAction = null;

        this.selectedIds.set(new Set());

        this.refreshBus.notify(); // recharge l'historique
        this.load();              // recharge les en attente
      },
      error: () => this.modalLoading.set(false)
    });
  }

  getUserId(userOrIri: any): string {
    if (!userOrIri) return '—';
    if (typeof userOrIri === 'object' && userOrIri.id) return String(userOrIri.id);
    const iri = typeof userOrIri === 'string' ? userOrIri : userOrIri?.['@id'];
    return iri?.split('/').pop() ?? '—';
  }

  getUsername(userOrIri: any): string {
    if (!userOrIri) return '—';
    if (typeof userOrIri === 'object' && userOrIri.username) return userOrIri.username;
    const id = this.getUserId(userOrIri);
    return id === '—' ? '—' : `User #${id}`;
  }
}
