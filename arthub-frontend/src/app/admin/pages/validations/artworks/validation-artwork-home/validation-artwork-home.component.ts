import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ValidationArtworkHistoryComponent } from '../validation-artwork-history/validation-artwork-history.component';
import { ValidationArtworkListComponent } from '../validation-artwork-list/validation-artwork-list.component';

type TabKey = 'pending' | 'history';

@Component({
  selector: 'app-validation-artwork-home.component',
  standalone: true,
  imports: [CommonModule, ValidationArtworkHistoryComponent, ValidationArtworkListComponent],
  templateUrl: './validation-artwork-home.component.html',
  styleUrl: './validation-artwork-home.component.scss',
})
export class ValidationArtworkHomeComponent {
  activeTab: TabKey = 'pending';

  tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Œuvres à valider' },
    { key: 'history', label: 'Historique des validations' },
  ];

  setTab(tab: TabKey) {
    this.activeTab = tab;
  }
}
