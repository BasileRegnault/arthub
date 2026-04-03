import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { User } from '../../../../core/models';
import { ActivatedRoute, Router } from '@angular/router';
import { PaginatedResult } from '../../../../core/utils/hydra';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { DateDisplayPipe } from "../../../../shared/pipes/date-display.pipe";
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { UserFilterComponent } from '../filter/user-filter.component';
import { PaginationComponent } from '../../../../shared/components/pagination.component/pagination.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, DateDisplayPipe, UserFilterComponent, ConfirmModalComponent, PaginationComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent {

  private api = inject(ApiPlatformService<User>);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  // État
  confirmModalOpen = signal(false);
  userToDeleteId: number | null = null;
  selectedUserName = '';

  confirmAction: 'delete' | 'suspend' | null = null;
  isSuspending = false;
  userToSuspendId: number | null = null;

  users = signal<PaginatedResult<User> | null>(null);
  loading = signal(false);

  page = signal(1);
  itemsPerPage = 20;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filtres pilotés par URL
  filters: any = {};

  usersWithProfilePicture = computed(() =>
    this.users()?.items.map(u => ({
      ...u,
      profilePictureUrl: u.profilePicture?.contentUrl
        ? environment.apiBaseUrl + u.profilePicture.contentUrl
        : 'assets/default-avatar.svg'
    })) || []
  );

  hasNextPage = computed(() => {
    const current = this.users();
    return current ? this.page() < (current.lastPage || 1) : false;
  });

  constructor() {
    // URL -> page + filtres -> chargement
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(qp => {
      const page = Number(qp.get('page') ?? '1');
      this.page.set(Number.isFinite(page) && page > 0 ? page : 1);

      const f: any = {};

      const username = qp.get('username');
      if (username) f.username = username;

      const email = qp.get('email');
      if (email) f.email = email;

      // role dans URL (simple)
      const role = qp.get('role');
      if (role) {
        f.role = role; // utile pour pré-remplir le select
        // API Platform : roles attend un tableau json-stringifie
        f.roles = JSON.stringify([role]);
      }

      // isSuspended URL: 'true' | 'false'
      const isSuspended = qp.get('isSuspended');
      if (isSuspended === 'true') f.isSuspended = true;
      else if (isSuspended === 'false') f.isSuspended = false;

      const createdAfter = qp.get('createdAt[after]');
      const createdBefore = qp.get('createdAt[before]');
      if (createdAfter) f['createdAt[after]'] = createdAfter;
      if (createdBefore) f['createdAt[before]'] = createdBefore;

      this.filters = f;

      this.fetchUsers(this.page());
    });
  }

  fetchUsers(page = 1) {
    const { role, ...backendFilters } = this.filters;

    const params = { page, itemsPerPage: this.itemsPerPage, ...backendFilters };
    this.loading.set(true);

    this.api.list('users', page, this.itemsPerPage, params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: PaginatedResult<User>) => {
        this.users.set({
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
        this.toast.show('Erreur lors du chargement des utilisateurs.', 'error');
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

  onSearch(filtersFromUi: any) {
    // filtersFromUi contient username/email/role/isSuspended(created string)/createdAt[...]
    this.updateUrl({ ...filtersFromUi, page: 1 });
  }

  onResetFilters() {
    this.updateUrl({ page: 1 });
  }

  // Tri local (inchangé)
  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const current = this.users();
    if (!current) return;

    const sortedItems = [...current.items].sort((a, b) => {
      const aVal = a[column as keyof User] ?? '';
      const bVal = b[column as keyof User] ?? '';
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.users.set({ ...current, items: sortedItems, page: current.page ?? this.page() });
  }

  onEdit(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/users/edit', id]);
  }

  onViewDetails(id?: number) {
    if (!id) return;
    this.router.navigate(['/admin/users', id]);
  }

  onDelete(id?: number, username: string = '') {
    this.userToDeleteId = id ?? null;
    this.selectedUserName = username ?? '';
    this.confirmAction = 'delete';
    this.confirmModalOpen.set(true);
  }

  handleConfirmDelete() {
    if (!this.userToDeleteId) return;

    this.api.delete('users', this.userToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.fetchUsers(this.page());
        this.userToDeleteId = null;
        this.confirmAction = null;
      },
      error: () => this.toast.show('Erreur lors de la suppression.', 'error')
    });

    this.confirmModalOpen.set(false);
  }

  handleCancelAction() {
    this.userToSuspendId = null;
    this.userToDeleteId = null;
    this.confirmAction = null;
    this.confirmModalOpen.set(false);
  }

  onToggleSuspend(id: number, username: string, currentlySuspended: boolean) {
    this.userToSuspendId = id;
    this.selectedUserName = username;
    this.isSuspending = !currentlySuspended;
    this.confirmAction = 'suspend';
    this.confirmModalOpen.set(true);
  }

  handleConfirmSuspend() {
    if (!this.userToSuspendId) return;

    this.api.patch('users', this.userToSuspendId, { isSuspended: this.isSuspending }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.fetchUsers(this.page());
        this.userToSuspendId = null;
        this.confirmAction = null;
      },
      error: () => this.toast.show('Erreur lors de la mise à jour de l\'utilisateur.', 'error')
    });

    this.confirmModalOpen.set(false);
  }
}
