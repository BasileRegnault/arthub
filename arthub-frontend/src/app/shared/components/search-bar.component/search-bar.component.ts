import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
})
export class SearchBarComponent {
  placeholder = input<string>('Rechercher...');
  initialValue = input<string>('');

  searchChange = output<string>();

  searchTerm = signal<string>('');
  private debounceTimer: any = null;

  constructor() {
    // Initialiser le terme de recherche avec la valeur initiale
    effect(() => {
      this.searchTerm.set(this.initialValue());
    });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);

    // Effacer le timer existant
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Recherche avec délai (debounce)
    this.debounceTimer = setTimeout(() => {
      this.searchChange.emit(value);
    }, 300);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchChange.emit('');
  }
}
