import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiPlatformService } from '../../../../../core/services/api-platform.service';
import { DateDisplayPipe } from '../../../../../shared/pipes/date-display.pipe';
import { environment } from '../../../../../environments/environment';
import { ValidationRefreshService } from '../../../../../core/services/validation-refresh.service';

@Component({
  selector: 'app-validation-artist-history',
  standalone: true,
  imports: [CommonModule, RouterLink, DateDisplayPipe],
  templateUrl: './validation-artist-history.component.html',
})
export class ValidationArtistHistoryComponent {
  private api = inject(ApiPlatformService<any>);
  private refreshBus = inject(ValidationRefreshService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  validations = signal<any>(null);
  loading = signal(false);

  page = signal(1);
  itemsPerPage = 10;

  hasNextPage = computed(() => {
    const current = this.validations();
    return current ? this.page() < (current.lastPage || 1) : false;
  });

  rowsWithImages = computed(() =>
    (this.validations()?.items ?? []).map((v: any) => {
      const artist = v.subject;
      const imageUrl = artist?.profilePicture?.contentUrl
        ? environment.apiBaseUrl + artist.profilePicture.contentUrl
        : (artist?.imageUrl ?? 'assets/default-avatar.svg');
      return { ...v, imageUrl };
    })
  );

  expandedReason = signal<Set<number>>(new Set());

  constructor() {
    this.load();

    this.refreshBus.refresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.fetch(1);       // tu peux garder la page() si tu préfères
      this.page.set(1);
    });
  }

  load() {
    this.fetch(this.page());
  }

  fetch(page = 1) {
    this.loading.set(true);

    this.api.getAll('admin/validations', {
      subjectType: 'artist',
      page,
      itemsPerPage: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.validations.set(res);
        this.loading.set(false);
        
      },
      error: () => this.loading.set(false)
    });
  }

  setPage(page: number) {
    this.page.set(page);
    this.load();
  }

  statusLabel(status: string) {
    if (status === 'approved') return 'Validé';
    if (status === 'rejected') return 'Refusé';
    return '—';
  }

  toggleReason(id?: number) {
    if (!id) return;
    const set = new Set(this.expandedReason());
    set.has(id) ? set.delete(id) : set.add(id);
    this.expandedReason.set(set);
  }

  statusClass(status: string) {
    return status === 'approved'
      ? 'bg-green-100 text-green-700'
      : status === 'rejected'
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-700';
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

  onViewDetails(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/artists', id]);
  }
}
