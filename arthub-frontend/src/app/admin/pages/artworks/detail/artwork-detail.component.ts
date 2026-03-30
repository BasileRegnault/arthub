import {
  Component,
  inject,
  OnDestroy,
  AfterViewInit,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { DateDisplayPipe } from '../../../../shared/pipes/date-display.pipe';
import { Chart, registerables } from 'chart.js';
import { DetailActionsComponent } from '../../../../shared/components/detail-actions.component/detail-actions.component';
import { ToastService } from '../../../../shared/services/toast.service';

Chart.register(...registerables);

type TabKey =
  | 'detail'
  | 'artist'
  | 'ratings'
  | 'galleries'
  | 'activity'
  | 'views';

@Component({
  selector: 'app-artwork-detail',
  standalone: true,
  imports: [CommonModule, DateDisplayPipe, RouterLink, DetailActionsComponent],
  templateUrl: './artwork-detail.component.html',
})
export class ArtworkDetailComponent implements AfterViewInit, OnDestroy {
  private api = inject(ApiPlatformService<any>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  artwork: any;
  artist: any;

  artworkTotalViews = 0;

  ratings: any[] = [];
  galleries: any[] = [];
  activityLogs: any[] = [];

  viewSeries: { date: string; views: number }[] = [];
  viewsRange: 7 | 30 | 90 | 365 = 30;

  averageRating = 0;

  activeTab: TabKey = 'detail';

  tabs: { key: TabKey; label: string }[] = [
    { key: 'detail', label: "Détail de l'œuvre" },
    { key: 'artist', label: 'Fiche artiste' },
    { key: 'ratings', label: 'Notes associées' },
    { key: 'galleries', label: 'Galeries' },
    { key: 'activity', label: 'Historique modifications' },
    { key: 'views', label: 'Vues / évolution' },
  ];

  private chart?: Chart;

  ngAfterViewInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.loadArtworkDetail(id);
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  loadArtworkDetail(id: number): void {
    this.destroyChart();

    this.api.get('admin/artworks/detail', id, { range: this.viewsRange }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.artwork = data.artwork;
        this.artist = data.artist;

        this.ratings = data.ratings || [];
        this.galleries = data.galleries || [];
        this.activityLogs = data.activityLogs || [];
        this.viewSeries = data.viewSeries || [];

        this.artworkTotalViews = data.artworkTotalViews ?? (this.artwork?.views ?? 0);

        this.averageRating = this.computeAverage(this.ratings);

        if (this.activeTab === 'views') {
          queueMicrotask(() => this.renderViewsChart());
        }
      },
      error: () => this.toast.show('Erreur lors du chargement des details de l\'oeuvre', 'error'),
    });
  }

  setTab(tab: TabKey): void {
    this.activeTab = tab;

    if (tab === 'views') {
      queueMicrotask(() => this.renderViewsChart());
    } else {
      this.destroyChart();
    }
  }

  onRangeChange(value: number): void {
    this.viewsRange = Number(value) as any;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.loadArtworkDetail(id);
  }

  toggleDisplay(): void {
    if (!this.artwork?.id) return;

    const newValue = !this.artwork.isDisplay;
    const payload = { isDisplay: newValue };

    this.api.patch('artworks', this.artwork.id, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.artwork.isDisplay = newValue;
      },
      error: () => this.toast.show('Impossible de modifier le statut', 'error'),
    });
  }

  onEdit() {
    if (!this.artwork?.id) return;
    this.router.navigate(['/admin/artworks/edit', this.artwork.id]);
  }


  trackById(_: number, item: any) {
    return item.id;
  }

  private computeAverage(ratings: any[]): number {
    if (!ratings?.length) return 0;
    const sum = ratings.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
    return sum / ratings.length;
  }

  private renderViewsChart(): void {
    this.destroyChart();

    const canvas = document.getElementById('artworkViewsChart') as HTMLCanvasElement | null;
    if (!canvas) return;

    if (!this.viewSeries?.length) return;
    
    const labels = this.viewSeries.map(v => v.date);
    const values = this.viewSeries.map(v => v.views);

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Vues uniques / jour',
          data: values,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }
}
