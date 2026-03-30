import { Component, inject, OnInit, AfterViewInit, OnDestroy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { DateDisplayPipe } from "../../../../shared/pipes/date-display.pipe";
import { Chart, registerables } from 'chart.js';
import { DetailActionsComponent } from '../../../../shared/components/detail-actions.component/detail-actions.component';
import { ToastService } from '../../../../shared/services/toast.service';

Chart.register(...registerables);

type TabKey = 'info' | 'artworks' | 'views' | 'activity';

@Component({
  selector: 'app-gallery-detail',
  standalone: true,
  imports: [CommonModule, DateDisplayPipe, RouterLink, DetailActionsComponent],
  templateUrl: './gallery-detail.component.html',
})
export class GalleryDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiPlatformService<any>);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  gallery: any;
  artworks: any[] = [];
  viewSeries: { date: string; views: number }[] = [];
  totalViews: number = 0;
  viewsRange: 7 | 30 | 90 | 365 = 30;
  activeTab: TabKey = 'info';
  activityLogs: any[] = [];

  tabs: { key: TabKey; label: string }[] = [
    { key: 'info', label: 'Informations' },
    { key: 'artworks', label: 'Œuvres' },
    { key: 'activity', label: 'Historique modifications' },
    { key: 'views', label: 'Vues / évolution' },
  ];

  private chart?: Chart;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.loadGalleryDetail(id);
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'views') {
      queueMicrotask(() => this.renderViewsChart());
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  loadGalleryDetail(id: number): void {
    this.destroyChart();
    this.api.get('admin/galleries/detail', id, { range: this.viewsRange }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.gallery = data.gallery;
        this.artworks = data.artworks || [];
        this.totalViews = data.totalViews || 0;
        this.activityLogs = data.activityLogs || [];
        this.viewSeries = data.viewSeries || [];
        this.totalViews = data.totalViews || 0;
        
        if (this.activeTab === 'views') {
          queueMicrotask(() => this.renderViewsChart());
        }
      },
      error: () => this.toast.show('Erreur lors du chargement des détails de la galerie', 'error'),
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
    if (id) this.loadGalleryDetail(id);
  }

  trackById(_: number, item: any) {
    return item.id;
  }

  private renderViewsChart(): void {
    this.destroyChart();
    const canvas = document.getElementById('galleryViewsChart') as HTMLCanvasElement | null;
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
          tension: 0.35,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
