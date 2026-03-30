import { Routes } from '@angular/router';
import { ArtistsListComponent } from './pages/artists-list/artists-list.component';
import { ArtistDetailComponent } from './pages/artist-detail/artist-detail.component';
import { ArtistCreateComponent } from './pages/artist-create/artist-create.component';
import { authGuard } from '../../core/guards/auth.guard';

export const artistsRoutes: Routes = [
  {
    path: '',
    component: ArtistsListComponent
  },
  {
    path: 'create',
    component: ArtistCreateComponent,
    canActivate: [authGuard]
  },
  {
    path: ':id',
    component: ArtistDetailComponent
  }
];
