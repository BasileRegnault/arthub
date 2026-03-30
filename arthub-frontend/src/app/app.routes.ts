import { provideRouter, Routes } from '@angular/router';
import { ClientLayoutComponent } from './features/layout/client-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Routes client avec layout
  {
    path: '',
    component: ClientLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'artworks',
        loadChildren: () => import('./features/artworks/artworks.routes').then(m => m.artworksRoutes)
      },
      {
        path: 'artists',
        loadChildren: () => import('./features/artists/artists.routes').then(m => m.artistsRoutes)
      },
      {
        path: 'galleries',
        loadChildren: () => import('./features/galleries/galleries.routes').then(m => m.galleriesRoutes)
      },
      {
        path: 'map',
        loadChildren: () => import('./features/map/map.routes').then(m => m.mapRoutes)
      },
      {
        path: 'ratings',
        loadChildren: () => import('./features/ratings/ratings.routes').then(m => m.ratingsRoutes)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/users/users.routes').then(m => m.usersRoutes)
      },
      {
        path: 'my-submissions',
        loadComponent: () => import('./features/users/pages/my-submissions/my-submissions.component').then(m => m.MySubmissionsComponent),
        canActivate: [authGuard]
      }
    ]
  },
  // Routes d'authentification (sans layout)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  // Routes admin (AdminLayout)
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
  },
];

export const appRouterProviders = [ provideRouter(routes) ];
