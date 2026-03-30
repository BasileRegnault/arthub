import { Routes } from '@angular/router';
import { ArtworksListComponent } from './pages/artworks-list/artworks-list.component';
import { ArtworkDetailComponent } from './pages/artwork-detail/artwork-detail.component';
import { ArtworkCreateComponent } from './pages/artwork-create/artwork-create.component';
import { authGuard } from '../../core/guards/auth.guard';

export const artworksRoutes: Routes = [
  {
    path: '',
    component: ArtworksListComponent
  },
  {
    path: 'create',
    component: ArtworkCreateComponent,
    canActivate: [authGuard]
  },
  {
    path: ':id',
    component: ArtworkDetailComponent
  }
];
