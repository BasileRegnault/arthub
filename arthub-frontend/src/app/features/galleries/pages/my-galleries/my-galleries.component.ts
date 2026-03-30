import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Gallery } from '../../../../core/models';
import { GalleryCardComponent } from '../../../../shared/components/gallery-card.component/gallery-card.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-my-galleries',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GalleryCardComponent,
    ConfirmModalComponent
  ],
  templateUrl: './my-galleries.component.html',
})
export class MyGalleriesComponent implements OnInit {
  private api = inject(ApiPlatformService<any>);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  galleries = signal<Gallery[]>([]);
  loading = signal(false);

  currentUser = this.authService.currentUser;

  // Modal de suppression
  confirmModalOpen = signal(false);
  galleryToDeleteId: number | null = null;
  selectedGalleryName = '';

  // Filtre
  filterType = signal<'all' | 'public' | 'private'>('all');

  filteredGalleries = computed(() => {
    const all = this.galleries();
    const filter = this.filterType();

    if (filter === 'public') {
      return all.filter(g => g.isPublic);
    }
    if (filter === 'private') {
      return all.filter(g => !g.isPublic);
    }
    return all;
  });

  // Stats
  totalGalleries = computed(() => this.galleries().length);
  totalPublic = computed(() => this.galleries().filter(g => g.isPublic).length);
  totalPrivate = computed(() => this.galleries().filter(g => !g.isPublic).length);
  totalArtworks = computed(() => {
    return this.galleries().reduce((sum, g) => {
      return sum + (g.artworks ? (g.artworks as any[]).length : 0);
    }, 0);
  });

  ngOnInit() {
    const userId = (this.currentUser as any)?.id;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadGalleries(userId);
  }

  loadGalleries(userId: number) {
    this.loading.set(true);

    this.api.list('galleries', 1, 100, {
      owner: `/api/users/${userId}`,
      'order[createdAt]': 'desc'
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.galleries.set(res.items || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.show('Erreur lors du chargement des galeries', 'error');
        }
      });
  }

  onEdit(galleryId: number) {
    this.router.navigate(['/admin/galleries/edit', galleryId]);
  }

  onDelete(galleryId: number) {
    const gallery = this.galleries().find(g => g.id === galleryId);
    this.galleryToDeleteId = galleryId;
    this.selectedGalleryName = gallery?.name || '';
    this.confirmModalOpen.set(true);
  }

  handleConfirmDelete() {
    if (!this.galleryToDeleteId) return;

    this.api.delete('galleries', this.galleryToDeleteId).subscribe({
      next: () => {
        this.confirmModalOpen.set(false);
        // Rafraîchir la liste
        const userId = (this.currentUser as any)?.id;
        if (userId) {
          this.loadGalleries(userId);
        }
      },
      error: () => {
        this.confirmModalOpen.set(false);
        this.toast.show('Erreur lors de la suppression de la galerie', 'error');
      }
    });
  }

  handleCancelDelete() {
    this.confirmModalOpen.set(false);
    this.galleryToDeleteId = null;
  }

  onToggleVisibility(galleryId: number) {
    const gallery = this.galleries().find(g => g.id === galleryId);
    if (!gallery) return;

    const newVisibility = !gallery.isPublic;

    this.api.patch('galleries', galleryId.toString(), { isPublic: newVisibility }).subscribe({
      next: () => {
        // Mettre à jour l'état local
        const updatedGalleries = this.galleries().map(g =>
          g.id === galleryId ? { ...g, isPublic: newVisibility } : g
        );
        this.galleries.set(updatedGalleries);
      },
      error: () => {
        this.toast.show('Erreur lors du changement de visibilité', 'error');
      }
    });
  }
}
