import { CommonModule } from '@angular/common';
import { Component, inject, input, DestroyRef } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ValidationCounterService } from '../../pages/validations/services/validation-counter.service';
import { ValidationRefreshService } from '../../../core/services/validation-refresh.service';


@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
})
export class AdminSidebarComponent {
  collapsed = input(false);

  private router = inject(Router);
  validationCounter = inject(ValidationCounterService);
  private refreshBus = inject(ValidationRefreshService);
  private destroyRef = inject(DestroyRef);

  validationMenuOpen = false;

  constructor() {
    this.validationCounter.refresh();

    // Rafraichissement reactif
    this.refreshBus.refresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.validationCounter.refresh();
    });

    if (this.router.url.startsWith('/admin/validations')) {
      this.validationMenuOpen = true;
    }

    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.router.url.startsWith('/admin/validations')) {
        this.validationMenuOpen = true;
      }
    });
  }

  toggleValidationMenu() {
    // option : si collapsed, on ne déplie pas le dropdown (sinon c'est moche)
    if (this.collapsed()) {
      this.router.navigate(['/admin/validations/artists']);
      return;
    }
    this.validationMenuOpen = !this.validationMenuOpen;
  }
}
