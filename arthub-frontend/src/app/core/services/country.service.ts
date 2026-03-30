import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, map, catchError } from 'rxjs';

export interface Country {
  name: {
    common: string;
    official: string;
    nativeName?: { [key: string]: { official: string; common: string } };
  };
  cca2: string; // ISO 3166-1 alpha-2 code (FR, US, etc.)
  cca3: string; // ISO 3166-1 alpha-3 code (FRA, USA, etc.)
  flag: string; // Emoji du drapeau
  flags: {
    png: string;
    svg: string;
  };
  translations: { [key: string]: { official: string; common: string } };
}

export interface SimpleCountry {
  code: string;      // Code ISO alpha-2
  name: string;      // Nom en français
  nameEn: string;    // Nom en anglais
  flag: string;      // Emoji du drapeau
}

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://restcountries.com/v3.1';

  // Cache de la liste des pays (chargé une seule fois)
  private countries$: Observable<SimpleCountry[]> | null = null;

  /**
   * Récupérer tous les pays (mis en cache)
   */
  getCountries(): Observable<SimpleCountry[]> {
    if (!this.countries$) {
      this.countries$ = this.http.get<Country[]>(`${this.API_URL}/all?fields=name,cca2,cca3,flag,flags,translations`)
        .pipe(
          map(countries => this.mapToSimpleCountries(countries)),
          map(countries => countries.sort((a, b) => a.name.localeCompare(b.name, 'fr'))),
          shareReplay(1),
          catchError(() => {
            // Liste de secours si l'API échoue
            return of(this.getFallbackCountries());
          })
        );
    }
    return this.countries$;
  }

  /**
   * Rechercher des pays par nom
   */
  searchCountries(query: string): Observable<SimpleCountry[]> {
    if (!query || query.length < 2) {
      return this.getCountries();
    }

    return this.getCountries().pipe(
      map(countries => {
        const lowerQuery = query.toLowerCase();
        return countries.filter(c =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.nameEn.toLowerCase().includes(lowerQuery) ||
          c.code.toLowerCase() === lowerQuery
        );
      })
    );
  }

  /**
   * Récupérer un pays par son code
   */
  getCountryByCode(code: string): Observable<SimpleCountry | null> {
    return this.getCountries().pipe(
      map(countries => countries.find(c => c.code === code) || null)
    );
  }

  /**
   * Récupérer un pays par son nom (correspondance exacte ou partielle)
   */
  getCountryByName(name: string): Observable<SimpleCountry | null> {
    if (!name) return of(null);

    return this.getCountries().pipe(
      map(countries => {
        const lowerName = name.toLowerCase();
        return countries.find(c =>
          c.name.toLowerCase() === lowerName ||
          c.nameEn.toLowerCase() === lowerName
        ) || null;
      })
    );
  }

  private mapToSimpleCountries(countries: Country[]): SimpleCountry[] {
    return countries.map(country => ({
      code: country.cca2,
      name: country.translations['fra']?.common || country.name.common,
      nameEn: country.name.common,
      flag: country.flag
    }));
  }

  private getFallbackCountries(): SimpleCountry[] {
    // Liste de secours des principaux pays
    return [
      { code: 'FR', name: 'France', nameEn: 'France', flag: '🇫🇷' },
      { code: 'US', name: 'États-Unis', nameEn: 'United States', flag: '🇺🇸' },
      { code: 'GB', name: 'Royaume-Uni', nameEn: 'United Kingdom', flag: '🇬🇧' },
      { code: 'DE', name: 'Allemagne', nameEn: 'Germany', flag: '🇩🇪' },
      { code: 'IT', name: 'Italie', nameEn: 'Italy', flag: '🇮🇹' },
      { code: 'ES', name: 'Espagne', nameEn: 'Spain', flag: '🇪🇸' },
      { code: 'NL', name: 'Pays-Bas', nameEn: 'Netherlands', flag: '🇳🇱' },
      { code: 'BE', name: 'Belgique', nameEn: 'Belgium', flag: '🇧🇪' },
      { code: 'CH', name: 'Suisse', nameEn: 'Switzerland', flag: '🇨🇭' },
      { code: 'JP', name: 'Japon', nameEn: 'Japan', flag: '🇯🇵' },
      { code: 'CN', name: 'Chine', nameEn: 'China', flag: '🇨🇳' },
      { code: 'RU', name: 'Russie', nameEn: 'Russia', flag: '🇷🇺' },
      { code: 'BR', name: 'Brésil', nameEn: 'Brazil', flag: '🇧🇷' },
      { code: 'AU', name: 'Australie', nameEn: 'Australia', flag: '🇦🇺' },
      { code: 'CA', name: 'Canada', nameEn: 'Canada', flag: '🇨🇦' },
      { code: 'MX', name: 'Mexique', nameEn: 'Mexico', flag: '🇲🇽' },
      { code: 'AR', name: 'Argentine', nameEn: 'Argentina', flag: '🇦🇷' },
      { code: 'IN', name: 'Inde', nameEn: 'India', flag: '🇮🇳' },
      { code: 'KR', name: 'Corée du Sud', nameEn: 'South Korea', flag: '🇰🇷' },
      { code: 'PT', name: 'Portugal', nameEn: 'Portugal', flag: '🇵🇹' },
      { code: 'PL', name: 'Pologne', nameEn: 'Poland', flag: '🇵🇱' },
      { code: 'AT', name: 'Autriche', nameEn: 'Austria', flag: '🇦🇹' },
      { code: 'SE', name: 'Suède', nameEn: 'Sweden', flag: '🇸🇪' },
      { code: 'NO', name: 'Norvège', nameEn: 'Norway', flag: '🇳🇴' },
      { code: 'DK', name: 'Danemark', nameEn: 'Denmark', flag: '🇩🇰' },
      { code: 'FI', name: 'Finlande', nameEn: 'Finland', flag: '🇫🇮' },
      { code: 'GR', name: 'Grèce', nameEn: 'Greece', flag: '🇬🇷' },
      { code: 'TR', name: 'Turquie', nameEn: 'Turkey', flag: '🇹🇷' },
      { code: 'EG', name: 'Égypte', nameEn: 'Egypt', flag: '🇪🇬' },
      { code: 'ZA', name: 'Afrique du Sud', nameEn: 'South Africa', flag: '🇿🇦' }
    ].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
}
