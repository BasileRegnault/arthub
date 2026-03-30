import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { CommonModule } from '@angular/common';
import { DateDisplayPipe } from "../../../../shared/pipes/date-display.pipe";
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, DateDisplayPipe, RouterLink],
  templateUrl: './user-detail.component.html',
})
export class UserDetailComponent implements OnInit {

  private api = inject(ApiPlatformService<any>);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  user: any;
  activityLogs: any[] = [];
  loginLogs: any[] = [];
  galleries: any[] = [];
  ratings: any[] = [];

  activeTab: 'info' | 'activity' | 'logins' | 'galleries' | 'ratings' = 'info';

  tabs: { key: 'info' | 'activity' | 'logins' | 'galleries' | 'ratings', label: string }[] = [
    { key: 'info', label: 'Informations' },
    { key: 'activity', label: 'Journaux d\'activite' },
    { key: 'logins', label: 'Journaux de connexion' },
    { key: 'galleries', label: 'Galeries' },
    { key: 'ratings', label: 'Evaluations' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadUserDetail(id);
    }
  }

  loadUserDetail(id: number) {
    this.api.get('admin/users/detail', id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.user = data.user;
        this.activityLogs = data.activityLogs || [];
        this.loginLogs = data.loginLogs || [];
        this.galleries = data.galleries || [];
        this.ratings = data.ratings || [];    
      },
      error: () => {
        this.toast.show('Erreur lors du chargement des details de l\'utilisateur', 'error');
      }
    });
  }

  trackById(_: number, item: any) {
    return item.id;
  }

  getArtworkId(url: string): string {
    // /api/artworks/1 -> 1
    return url.split('/').pop()!;
  }
}
