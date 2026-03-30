import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();

  hasPrevious = computed(() => this.currentPage() > 1);
  hasNext = computed(() => this.currentPage() < this.totalPages());

  // Générer les numéros de page à afficher
  pages = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      // Afficher toutes les pages si 7 ou moins
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Toujours afficher la première page
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      // Afficher les pages autour de la page actuelle
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      // Toujours afficher la dernière page
      pages.push(total);
    }

    return pages;
  });

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.pageChange.emit(page);
  }

  goToPrevious(): void {
    if (this.hasPrevious()) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  goToNext(): void {
    if (this.hasNext()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  isNumber(value: number | string): boolean {
    return typeof value === 'number';
  }
}
