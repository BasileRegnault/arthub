import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type StarSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
})
export class StarRatingComponent {
  rating = input<number>(0);
  readonly = input<boolean>(false);
  size = input<StarSize>('md');

  ratingChange = output<number>();

  hoveredStar = signal<number | null>(null);

  stars = [1, 2, 3, 4, 5];

  get sizeClass(): string {
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-10 h-10'
    };
    return sizes[this.size()];
  }

  onStarClick(star: number): void {
    if (this.readonly()) return;
    this.ratingChange.emit(star);
  }

  onStarHover(star: number): void {
    if (this.readonly()) return;
    this.hoveredStar.set(star);
  }

  onMouseLeave(): void {
    this.hoveredStar.set(null);
  }

  isStarFilled(star: number): boolean {
    const currentRating = this.hoveredStar() ?? this.rating();
    return star <= currentRating;
  }
}
