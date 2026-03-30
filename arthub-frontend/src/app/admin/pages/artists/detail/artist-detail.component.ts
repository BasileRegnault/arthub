import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { DateDisplayPipe } from '../../../../shared/pipes/date-display.pipe';
import { DetailActionsComponent } from '../../../../shared/components/detail-actions.component/detail-actions.component';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-artist-detail',
  standalone: true,
  imports: [CommonModule, DateDisplayPipe, RouterLink, DetailActionsComponent],
  templateUrl: './artist-detail.component.html',
})
export class ArtistDetailComponent implements OnInit {
  private api = inject(ApiPlatformService<any>);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  artist: any;
  artworks: any[] = [];
  activityLogs: any[] = [];

  activeTab: 'info' | 'activity' | 'artworks' = 'info';

  tabs: { key: 'info' | 'activity' | 'artworks'; label: string }[] = [
    { key: 'info', label: 'Informations' },
    { key: 'activity', label: 'Journaux d\'activite' },
    { key: 'artworks', label: 'Oeuvres' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadArtistDetail(id);
    }
  }

  loadArtistDetail(id: number) {
    this.api.get('admin/artists/detail', id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.artist = data.artist;
        this.artworks = data.artworks || [];
        this.activityLogs = data.activityLogs || [];
      },
      error: () => this.toast.show('Erreur lors du chargement des details de l\'artiste', 'error'),
    });
  }

  trackById(_: number, item: any) {
    return item.id;
  }

  getUserId(user: any): string {
    if (!user) return '';
    if (typeof user === 'string') {
      return user.split('/').pop()!;
    }
    return user.id;
  }

}
