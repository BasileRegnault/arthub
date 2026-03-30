import { Component, inject, OnInit, Input, signal, computed, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CountryService, SimpleCountry } from '../../../core/services/country.service';

@Component({
  selector: 'app-country-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-country-autocomplete.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCountryAutocompleteComponent),
      multi: true
    }
  ]
})
export class AppCountryAutocompleteComponent implements OnInit, ControlValueAccessor {
  private countryService = inject(CountryService);

  @Input() label = 'Pays';
  @Input() placeholder = 'Rechercher un pays...';

  inputControl = new FormControl('');
  allCountries = signal<SimpleCountry[]>([]);
  filteredCountries = signal<SimpleCountry[]>([]);
  showDropdown = signal(false);
  loading = signal(true);
  hasSearched = signal(false);

  value: string | null = null; // Stocke le nom du pays (string)
  private onChange: (value: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  ngOnInit() {
    // Charger tous les pays une seule fois
    this.countryService.getCountries().subscribe({
      next: countries => {
        this.allCountries.set(countries);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });

    // Filtrer lors des changements de saisie
    this.inputControl.valueChanges.pipe(
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(val => {
      this.filterCountries(val);
    });

    // Effacer la valeur quand le champ est vidé
    this.inputControl.valueChanges.subscribe(val => {
      if (val === '' && this.value) {
        this.value = null;
        this.onChange(null);
        this.hasSearched.set(false);
      }
    });
  }

  private filterCountries(query: string | null) {
    if (!query || query.length < 1) {
      this.filteredCountries.set([]);
      this.hasSearched.set(false);
      return;
    }

    this.hasSearched.set(true);
    const lowerQuery = query.toLowerCase();

    const results = this.allCountries().filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.nameEn.toLowerCase().includes(lowerQuery) ||
      c.code.toLowerCase() === lowerQuery
    ).slice(0, 10); // Limiter à 10 résultats

    this.filteredCountries.set(results);
  }

  selectCountry(country: SimpleCountry) {
    this.value = country.name;
    this.inputControl.setValue(this.displayFn(country), { emitEvent: false });
    this.showDropdown.set(false);
    this.filteredCountries.set([]);
    this.hasSearched.set(false);
    this.onChange(country.name);
  }

  onFocus() {
    this.showDropdown.set(true);
    this.onTouched();
    // Afficher les pays populaires quand on focus sans recherche
    if (!this.inputControl.value) {
      this.filteredCountries.set(this.getPopularCountries());
    }
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  displayFn(country: SimpleCountry | null): string {
    return country ? `${country.flag} ${country.name}` : '';
  }

  private getPopularCountries(): SimpleCountry[] {
    const popularCodes = ['FR', 'US', 'GB', 'DE', 'IT', 'ES', 'NL', 'BE', 'JP', 'CN'];
    return this.allCountries()
      .filter(c => popularCodes.includes(c.code))
      .slice(0, 8);
  }

  // Implementation de ControlValueAccessor
  writeValue(val: string | null): void {
    this.value = val;
    if (!val) {
      this.inputControl.setValue('', { emitEvent: false });
      return;
    }

    // Essayer de trouver le pays pour afficher avec le drapeau
    const country = this.allCountries().find(c =>
      c.name.toLowerCase() === val.toLowerCase() ||
      c.nameEn.toLowerCase() === val.toLowerCase()
    );

    if (country) {
      this.inputControl.setValue(this.displayFn(country), { emitEvent: false });
    } else {
      // Pays non trouvé dans la liste, afficher simplement la valeur
      this.inputControl.setValue(val, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.inputControl.disable() : this.inputControl.enable();
  }

  get results() {
    return computed(() => this.filteredCountries());
  }

  get shouldShowNoResults(): boolean {
    return this.hasSearched() &&
           !this.loading() &&
           this.filteredCountries().length === 0 &&
           !!this.inputControl.value;
  }

  get showPopularCountries(): boolean {
    return !this.hasSearched() && !this.inputControl.value && this.showDropdown();
  }
}
