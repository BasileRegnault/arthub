import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ApiPlatformService } from '../../core/services/api-platform.service';
import { AuthService } from '../../core/auth/auth.service';
import { Artwork, Artist } from '../../core/models';
import { ArtworkCardComponent } from "../artworks/components/artwork-card.component";
import { Stats } from '../../core/models/stats.model';
import { ArtistCardComponent } from '../artists/components/artist-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [CommonModule, RouterLink, ArtworkCardComponent, ArtistCardComponent],
})
export class HomeComponent implements OnInit {
  private api = inject(ApiPlatformService<any>);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  isAuthenticated = () => this.authService.isAuthenticated();

  artworks = signal<Artwork[]>([]);
  artists = signal<Artist[]>([]);
  artistTopArtworks = signal<Map<number, Artwork>>(new Map());
  stats = signal<Stats>({ artworks: 0, artists: 0, galleries: 0, users: 0 });
  loading = signal(true);

  ngOnInit() {
    this.loadArtworks();
    this.loadArtists();
    this.loadStats();
  }

  private loadArtworks() {
    this.api.list('artworks', 1, 8, { 'order[createdAt]': 'desc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.artworks.set(res.items || []);
        },
        error: () => {
          this.artworks.set([]);
        }
      });
  }

  private loadArtists() {
    this.api.list('artists', 1, 6, { 'order[createdAt]': 'desc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const artists = res.items || [];
          this.artists.set(artists);
        },
        error: () => {
          this.artists.set([]);
        }
      });
  }


  private loadStats() {
    // Charger les statistiques en parallèle avec forkJoin
    forkJoin({
      artworks: this.api.list('artworks', 1, 1),
      artists: this.api.list('artists', 1, 1),
      galleries: this.api.list('galleries', 1, 1),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ artworks, artists, galleries }) => {
        this.stats.set({
          artworks: artworks?.total || 0,
          artists: artists?.total || 0,
          galleries: galleries?.total || 0,
          users: 0,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
