import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, debounceTime } from 'rxjs';
import { ClientHeaderComponent } from './header/client-header.component';
import { ClientFooterComponent } from './footer/client-footer.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ClientHeaderComponent, ClientFooterComponent],
  template: `
    <div class="flex flex-col min-h-screen">
      <app-client-header [scrolled]="isScrolled()" class="shrink-0" />
      <main class="flex-grow bg-gray-50">
        <router-outlet />
      </main>
      <app-client-footer class="shrink-0 mt-auto" />
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    app-client-header,
    app-client-footer {
      display: block;
    }
  `]
})
export class ClientLayoutComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  isScrolled = signal(false);

  ngOnInit() {
    fromEvent(window, 'scroll').pipe(
      debounceTime(50),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.isScrolled.set(window.scrollY > 50);
    });
  }
}
