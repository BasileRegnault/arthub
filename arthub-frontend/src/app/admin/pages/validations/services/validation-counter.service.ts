// validation-counter.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { forkJoin } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ValidationCounterService {
  private api = inject(ApiPlatformService<any>);

  private _artistsCount = signal(0);
  private _artworksCount = signal(0);
  private _loading = signal(false);

  artistsCount = computed(() => this._artistsCount());
  artworksCount = computed(() => this._artworksCount());
  loading = computed(() => this._loading());

  total = computed(() => this._artistsCount() + this._artworksCount());

  refresh() {
    this._loading.set(true);

    const artists$ = this.api.list('artists', 1, 1, { isConfirmCreate: false, toBeConfirmed: true });
    const artworks$ = this.api.list('artworks', 1, 1, { isConfirmCreate: false, toBeConfirmed: true });

    forkJoin([artists$, artworks$]).subscribe({
      next: ([artistsRes, artworksRes]) => {
        this._artistsCount.set(artistsRes?.total ?? 0);
        this._artworksCount.set(artworksRes?.total ?? 0);
        this._loading.set(false);
      },
      error: () => this._loading.set(false)
    });
  }
}
