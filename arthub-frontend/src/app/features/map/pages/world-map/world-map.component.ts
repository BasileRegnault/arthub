import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Artwork } from '../../../../core/models';

interface CountryData {
  code: string;
  name: string;
  count: number;
}

@Component({
  selector: 'app-world-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './world-map.component.html',
})
export class WorldMapComponent implements OnInit {
  private api = inject(ApiPlatformService<Artwork>);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  countryData = signal<CountryData[]>([]);
  hoveredCountry = signal<CountryData | null>(null);

  totalArtworks = computed(() =>
    this.countryData().reduce((sum, c) => sum + c.count, 0)
  );

  countriesWithArt = computed(() =>
    this.countryData().filter(c => c.count > 0).length
  );

  // Mapping des noms de pays (valeurs de localisation des œuvres)
  countries: { code: string; name: string; displayName: string }[] = [
    { code: 'FR', name: 'France', displayName: 'France' },
    { code: 'IT', name: 'Italie', displayName: 'Italie' },
    { code: 'ES', name: 'Espagne', displayName: 'Espagne' },
    { code: 'DE', name: 'Allemagne', displayName: 'Allemagne' },
    { code: 'GB', name: 'Royaume-Uni', displayName: 'Royaume-Uni' },
    { code: 'NL', name: 'Pays-Bas', displayName: 'Pays-Bas' },
    { code: 'BE', name: 'Belgique', displayName: 'Belgique' },
    { code: 'US', name: 'Etats-Unis', displayName: 'Etats-Unis' },
    { code: 'JP', name: 'Japon', displayName: 'Japon' },
    { code: 'CN', name: 'Chine', displayName: 'Chine' },
    { code: 'RU', name: 'Russie', displayName: 'Russie' },
    { code: 'AT', name: 'Autriche', displayName: 'Autriche' },
    { code: 'CH', name: 'Suisse', displayName: 'Suisse' },
    { code: 'PT', name: 'Portugal', displayName: 'Portugal' },
    { code: 'GR', name: 'Grece', displayName: 'Grece' },
    { code: 'PL', name: 'Pologne', displayName: 'Pologne' },
    { code: 'SE', name: 'Suede', displayName: 'Suede' },
    { code: 'NO', name: 'Norvege', displayName: 'Norvege' },
    { code: 'DK', name: 'Danemark', displayName: 'Danemark' },
    { code: 'FI', name: 'Finlande', displayName: 'Finlande' },
    { code: 'IE', name: 'Irlande', displayName: 'Irlande' },
    { code: 'CZ', name: 'Republique Tcheque', displayName: 'Rep. Tcheque' },
    { code: 'HU', name: 'Hongrie', displayName: 'Hongrie' },
    { code: 'RO', name: 'Roumanie', displayName: 'Roumanie' },
    { code: 'UA', name: 'Ukraine', displayName: 'Ukraine' },
    { code: 'TR', name: 'Turquie', displayName: 'Turquie' },
    { code: 'EG', name: 'Egypte', displayName: 'Egypte' },
    { code: 'MA', name: 'Maroc', displayName: 'Maroc' },
    { code: 'ZA', name: 'Afrique du Sud', displayName: 'Afrique du Sud' },
    { code: 'IN', name: 'Inde', displayName: 'Inde' },
    { code: 'KR', name: 'Coree du Sud', displayName: 'Coree du Sud' },
    { code: 'AU', name: 'Australie', displayName: 'Australie' },
    { code: 'NZ', name: 'Nouvelle-Zelande', displayName: 'Nouvelle-Zelande' },
    { code: 'BR', name: 'Bresil', displayName: 'Bresil' },
    { code: 'AR', name: 'Argentine', displayName: 'Argentine' },
    { code: 'MX', name: 'Mexique', displayName: 'Mexique' },
    { code: 'CA', name: 'Canada', displayName: 'Canada' },
  ];

  ngOnInit() {
    this.loadArtworksByCountry();
  }

  private loadArtworksByCountry() {
    this.loading.set(true);

    // Charger les comptages pour chaque pays
    const countPromises = this.countries.map(country =>
      new Promise<CountryData>((resolve) => {
        this.api.list('artworks', 1, 1, { location: country.name })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: res => {
              resolve({
                code: country.code,
                name: country.displayName,
                count: res.total || 0
              });
            },
            error: () => {
              resolve({
                code: country.code,
                name: country.displayName,
                count: 0
              });
            }
          });
      })
    );

    Promise.all(countPromises).then(data => {
      // Trier par comptage décroissant
      data.sort((a, b) => b.count - a.count);
      this.countryData.set(data);
      this.loading.set(false);
    });
  }

  getCountryColor(code: string): string {
    const country = this.countryData().find(c => c.code === code);
    if (!country || country.count === 0) return '#e2e8f0'; // slate-200

    const maxCount = Math.max(...this.countryData().map(c => c.count), 1);
    const intensity = country.count / maxCount;

    // Dégradé de slate-300 à slate-700
    if (intensity > 0.8) return '#334155'; // slate-700
    if (intensity > 0.6) return '#475569'; // slate-600
    if (intensity > 0.4) return '#64748b'; // slate-500
    if (intensity > 0.2) return '#94a3b8'; // slate-400
    return '#cbd5e1'; // slate-300
  }

  getCountryData(code: string): CountryData | undefined {
    return this.countryData().find(c => c.code === code);
  }

  onCountryHover(code: string | null) {
    if (code) {
      const data = this.getCountryData(code);
      this.hoveredCountry.set(data || null);
    } else {
      this.hoveredCountry.set(null);
    }
  }

  onCountryClick(code: string) {
    const country = this.countries.find(c => c.code === code);
    if (country) {
      this.router.navigate(['/artworks'], {
        queryParams: { location: country.name }
      });
    }
  }
}
