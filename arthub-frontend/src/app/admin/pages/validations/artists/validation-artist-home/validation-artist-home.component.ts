import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ValidationArtistHistoryComponent } from '../validation-artist-history/validation-artist-history.component';
import { ValidationArtistListComponent } from '../validation-artist-list/validation-artist-list.component';

type TabKey = 'pending' | 'history';

@Component({
  selector: 'app-validation-artist-home',
  standalone: true,
  imports: [CommonModule, ValidationArtistHistoryComponent, ValidationArtistListComponent],
  templateUrl: './validation-artist-home.component.html',
  styleUrl: './validation-artist-home.component.scss',
})
export class ValidationArtistHomeComponent {
  activeTab: TabKey = 'pending';

  tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Artistes à valider' },
    { key: 'history', label: 'Historique des validations' },
  ];

  setTab(tab: TabKey) {
    this.activeTab = tab;
  }
}
