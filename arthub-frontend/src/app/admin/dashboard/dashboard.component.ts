import {
  Component,
  inject,
  signal,
  AfterViewInit,
  OnDestroy,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ApiPlatformService } from '../../core/services/api-platform.service';
import { Chart, registerables } from 'chart.js';
import { RouterLink } from '@angular/router';
import { KpiCardComponent } from '../../shared/components/kpi-card.component/kpi-card.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, KpiCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AdminDashboardComponent implements AfterViewInit, OnDestroy {

  private api = inject(ApiPlatformService<any>);
  private destroyRef = inject(DestroyRef);

  kpis = signal<any>(null);
  charts = signal<any>(null);

  latestConnections: any[] = [];
  latestArtworks: any[] = [];
  latestAdminActions: any[] = [];

  // Limites parametrables
  limits = {
    connections: 10,
    artworks: 10,
    adminActions: 10,
  };

  // Stock des graphiques pour le nettoyage
  private chartInstances: Chart[] = [];

  ngAfterViewInit() {
    this.loadStats();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  // ===============================
  // DONNEES
  // ===============================
  loadStats() {
    this.destroyCharts();

    this.api.getAll('admin/dashboard', {
      limitConnections: this.limits.connections,
      limitArtworks: this.limits.artworks,
      limitAdminActions: this.limits.adminActions,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const data = res.items?.[0] ?? res;

        this.kpis.set(data.kpis);
        this.charts.set(data.charts);

        this.latestConnections = data.tables.latestConnections ?? [];
        this.latestArtworks = data.tables.latestArtworks ?? [];
        this.latestAdminActions = data.tables.latestAdminActions ?? [];

        this.initCharts();
      }
    });
  }

  onLimitChange(
    type: 'connections' | 'artworks' | 'adminActions',
    value: number
  ) {
    this.limits[type] = Number(value);
    this.loadStats();
  }

  // ===============================
  // GRAPHIQUES
  // ===============================
  initCharts() {
    this.artworksByMonthChart();
    this.connectionsByDayChart();
    this.artworksDisplayedChart();
    this.stylesChart();
    this.nationalitiesChart();
  }

  destroyCharts() {
    this.chartInstances.forEach(c => c.destroy());
    this.chartInstances = [];
  }

  artworksByMonthChart() {
    const data = this.charts()?.artworksByMonth ?? [];

    const chart = new Chart('artworksByMonth', {
      type: 'line',
      data: {
        labels: data.map((d: any) => d.month),
        datasets: [{
          label: 'Œuvres créées',
          data: data.map((d: any) => d.total),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.3)',
          tension: 0.4
        }]
      }
    });

    this.chartInstances.push(chart);
  }

  connectionsByDayChart() {
    const data = this.charts()?.connectionsByDay ?? [];

    const chart = new Chart('connectionsByDay', {
      type: 'line',
      data: {
        labels: data.map((d: any) => d.day),
        datasets: [{
          label: 'Connexions',
          data: data.map((d: any) => d.total),
          borderColor: '#10b981'
        }]
      }
    });

    this.chartInstances.push(chart);
  }

  artworksDisplayedChart() {
    const data = this.charts()?.artworksDisplayed;

    if (!data) return;

    const chart = new Chart('artworksDisplayed', {
      type: 'doughnut',
      data: {
        labels: ['Affichées', 'Masquées'],
        datasets: [{
          data: [data.displayed, data.hidden],
          backgroundColor: ['#3b82f6', '#ef4444']
        }]
      }
    });

    this.chartInstances.push(chart);
  }

  stylesChart() {
    const data = this.charts()?.styles ?? [];

    const chart = new Chart('stylesChart', {
      type: 'pie',
      data: {
        labels: data.map((d: any) => d.style),
        datasets: [{
          data: data.map((d: any) => d.total)
        }]
      }
    });

    this.chartInstances.push(chart);
  }

  nationalitiesChart() {
  const data = this.charts()?.nationalities ?? [];

  if (!data.length) return;

  const chart = new Chart('nationalitiesChart', {
    type: 'bar',
    data: {
      labels: data.map((d: any) => d.nationality),
      datasets: [{
        label: 'Artistes',
        data: data.map((d: any) => d.total),
        backgroundColor: '#6366f1'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            precision: 0
          }
        }
      }
    }
  });

  this.chartInstances.push(chart);
}
}
