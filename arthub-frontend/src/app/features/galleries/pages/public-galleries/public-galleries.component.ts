import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Gallery } from '../../../../core/models';
import { PaginatedResult } from '../../../../core/utils/hydra';
import { GalleryCardComponent } from '../../../../shared/components/gallery-card.component/gallery-card.component';
import { PaginationComponent } from '../../../../shared/components/pagination.component/pagination.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar.component/search-bar.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-public-galleries',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GalleryCardComponent,
    PaginationComponent,
    SearchBarComponent
  ],
  templateUrl: './public-galleries.component.html',
})
export class PublicGalleriesComponent implements OnInit {
  private api = inject(ApiPlatformService<any>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  galleries = signal<PaginatedResult<Gallery> | null>(null);
  loading = signal(false);

  page = signal(1);
  itemsPerPage = 12;
  searchTerm = signal('');

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const page = Number(params.get('page') ?? '1');
        this.page.set(page > 0 ? page : 1);
        this.searchTerm.set(params.get('search') ?? '');
        this.fetchGalleries();
      });
  }

  fetchGalleries() {
    this.loading.set(true);

    const filters: any = {
      isPublic: true,
      'order[createdAt]': 'desc'
    };
    if (this.searchTerm()) {
      filters.name = this.searchTerm();
    }

    this.api.list('galleries', this.page(), this.itemsPerPage, filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

  updateUrl() {
    const queryParams: any = { page: this.page() };
    if (this.searchTerm()) queryParams.search = this.searchTerm();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page.set(1);
    this.updateUrl();
  }

  onPageChange(newPage: number) {
    this.page.set(newPage);
    this.updateUrl();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.page.set(1);
    this.updateUrl();
  }
}
