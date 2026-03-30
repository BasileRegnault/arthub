import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Gallery } from '../../../../core/models';
import { GalleryCardComponent } from '../../../../shared/components/gallery-card.component/gallery-card.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-user-galleries',
  standalone: true,
  imports: [CommonModule, GalleryCardComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-gradient-to-r from-slate-700 to-slate-800 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-4xl font-bold mb-2">Galeries de l'Utilisateur</h1>
          <p class="text-xl text-white/90">{{ galleries().length }} galeries publiques</p>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (loading()) {
          <div class="text-center py-8">Chargement...</div>
        } @else if (galleries().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (gallery of galleries(); track gallery.id) {
              <app-gallery-card [gallery]="gallery" />
            }
          </div>
        } @else {
          <div class="text-center py-16">
            <p class="text-gray-600">Cet utilisateur n'a pas encore de galeries publiques</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class UserGalleriesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiPlatformService<any>);
  private destroyRef = inject(DestroyRef);

  galleries = signal<Gallery[]>([]);
  loading = signal(true);

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.router.navigate(['/galleries']);
      return;
    }
    this.loadGalleries(Number(userId));
  }

  loadGalleries(userId: number) {
    this.api.list('galleries', 1, 100, {
      owner: `/api/users/${userId}`,
      isPublic: true,
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
          alert('Erreur lors du chargement des galeries');
        }
      });
  }
}
