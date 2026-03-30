import { Component, inject, OnInit, signal, computed, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, map, of } from 'rxjs';
import { ApiPlatformService } from '../../../core/services/api-platform.service';
import { SimpleUser } from '../../../core/models';

type UserValue = SimpleUser | string | null; // string = IRI "/api/users/12"

@Component({
  selector: 'app-user-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-user-autocomplete.component.html',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AppUserAutocompleteComponent),
    multi: true
  }]
})
export class AppUserAutocompleteComponent implements OnInit, ControlValueAccessor {

  private api = inject(ApiPlatformService<SimpleUser>);

  inputControl = new FormControl('');
  allUsers = signal<SimpleUser[]>([]);
  remoteUsers = signal<SimpleUser[]>([]);
  defaultUsers = signal<SimpleUser[]>([]); // 5 premiers utilisateurs à afficher par défaut
  showDropdown = signal(false);
  loading = signal(false);
  hasSearched = signal(false); // Pour savoir si l'utilisateur a tapé quelque chose

  value: SimpleUser | null = null;

  private onChange: (value: SimpleUser | null) => void = () => {};
  protected onTouched: () => void = () => {};

  ngOnInit() {
    // Charger les premiers utilisateurs pour affichage par défaut
    this.api.list('users', 1, 5).subscribe(res => {
      this.allUsers.set(res.items);
      // Prendre les 5 premiers pour l'affichage par défaut
      this.defaultUsers.set(res.items.slice(0, 5));
    });

    // autocomplete
    this.inputControl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(val => this.filterUsers(val))
    ).subscribe(res => {
      this.remoteUsers.set(res);
      this.loading.set(false);
    });

    // optionnel : effacement => clear la valeur
    this.inputControl.valueChanges.subscribe(val => {
      if (val === '' && this.value) {
        this.value = null;
        this.onChange(null);
        this.hasSearched.set(false);
      }
    });
  }

  private filterUsers(val: string | SimpleUser | null) {
    if (!val || typeof val !== 'string' || val.trim().length < 2) {
      this.remoteUsers.set([]);
      this.hasSearched.set(false);
      return of([]);
    }

    this.hasSearched.set(true);
    const query = val.trim().toLowerCase();

    const localResults = this.allUsers().filter(u =>
      (u.username ?? '').toLowerCase().includes(query)
    );

    if (localResults.length >= 10) {
      return of(localResults);
    }

    this.loading.set(true);

    return this.api.list('users', 1, 20, { username: query }).pipe(
      map(res => {
        const remoteOnly = res.items.filter(r => !localResults.find(l => l.id === r.id));
        return [...localResults, ...remoteOnly];
      })
    );
  }

  selectUser(user: SimpleUser) {
    this.value = user;
    this.inputControl.setValue(user.username ?? '', { emitEvent: false });
    this.showDropdown.set(false);
    this.remoteUsers.set([]);
    this.hasSearched.set(false);
    this.onChange(user);
  }

  onFocus() {
    this.showDropdown.set(true);
    this.onTouched();
  }

  onBlur() {
    // Délai pour permettre le clic sur les éléments du dropdown
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  // --- Prise en charge des IRI ---
  private extractIdFromIri(iri: string): number | null {
    // supporte "/api/users/12" ou "https://.../api/users/12"
    const m = iri.match(/\/users\/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  // Implementation de ControlValueAccessor
  writeValue(obj: UserValue): void {
    // reinitialisation
    if (!obj) {
      this.value = null;
      this.inputControl.setValue('', { emitEvent: false });
      return;
    }

    // cas objet
    if (typeof obj === 'object') {
      this.value = obj;
      this.inputControl.setValue(obj?.username ?? '', { emitEvent: false });
      return;
    }

    // cas IRI string "/api/users/12"
    const id = this.extractIdFromIri(obj);
    if (!id) {
      this.value = null;
      this.inputControl.setValue('', { emitEvent: false });
      return;
    }

    // si déjà chargé
    if (this.value?.id === id) {
      this.inputControl.setValue(this.value.username ?? '', { emitEvent: false });
      return;
    }

    // texte temporaire
    this.inputControl.setValue(`User #${id}`, { emitEvent: false });

    // requete pour afficher le nom d'utilisateur
    this.api.get('users', id).subscribe({
      next: (u) => {
        this.value = u;
        this.inputControl.setValue(u?.username ?? `User #${id}`, { emitEvent: false });

        // on enrichit le cache local si absent
        const exists = this.allUsers().some(x => x.id === u.id);
        if (!exists) this.allUsers.set([u, ...this.allUsers()]);
      },
      error: () => {
        this.value = null;
        this.inputControl.setValue(`User #${id}`, { emitEvent: false });
      }
    });
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.inputControl.disable() : this.inputControl.enable();
  }

  get results() {
    return computed(() => {
      // Si l'utilisateur a recherché, montrer les résultats de recherche
      if (this.hasSearched() || this.inputControl.value) {
        return this.remoteUsers();
      }
      // Sinon, montrer les 5 premiers utilisateurs par défaut
      return this.defaultUsers();
    });
  }

  get shouldShowNoResults(): boolean {
    return this.hasSearched() &&
           !this.loading() &&
           this.remoteUsers().length === 0 &&
           this.inputControl.value !== null &&
           this.inputControl.value !== '';
  }
}
