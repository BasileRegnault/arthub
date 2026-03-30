import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { adminGuard } from '../core/guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    data: { breadcrumb: 'Admin' },
    children: [
      {
        path: '',
        data: { breadcrumb: 'Dashboard' },
        loadComponent: () =>
          import('./dashboard/dashboard.component')
            .then(m => m.AdminDashboardComponent)
      },

      { path: 'artworks', data: { breadcrumb: 'Œuvres' }, loadComponent: () =>
          import('./pages/artworks/list/artwork-list.component').then(m => m.ArtworkListComponent)
      },
      { path: 'artworks/new', data: { breadcrumb: 'Œuvres > Nouveau' }, loadComponent: () =>
          import('./pages/artworks/form/artwork-form.component').then(m => m.ArtworkFormComponent)
      },
      { path: 'artworks/:id', data: { breadcrumb: 'Œuvres > :id' }, loadComponent: () =>
          import('./pages/artworks/detail/artwork-detail.component').then(m => m.ArtworkDetailComponent)
      },
      { path: 'artworks/edit/:id', data: { breadcrumb: 'Œuvres > :id > Edit' }, loadComponent: () =>
          import('./pages/artworks/form/artwork-form.component').then(m => m.ArtworkFormComponent)
      },

      { path: 'galleries', data: { breadcrumb: 'Galeries' }, loadComponent: () =>
          import('./pages/galleries/list/gallery-list.component').then(m => m.GalleryListComponent)
      },
      { path: 'galleries/new', data: { breadcrumb: 'Galeries > Nouveau' }, loadComponent: () =>
          import('./pages/galleries/form/gallery-form.component').then(m => m.GalleryFormComponent)
      },
      { path: 'galleries/:id', data: { breadcrumb: 'Galeries > :id' }, loadComponent: () =>
          import('./pages/galleries/detail/gallery-detail.component').then(m => m.GalleryDetailComponent)
      },
      { path: 'galleries/edit/:id', data: { breadcrumb: 'Galeries > :id > Edit' }, loadComponent: () =>
          import('./pages/galleries/form/gallery-form.component').then(m => m.GalleryFormComponent)
      },

      { path: 'artists', data: { breadcrumb: 'Artistes' }, loadComponent: () =>
          import('./pages/artists/list/artist-list.component').then(m => m.ArtistListComponent)
      },
      { path: 'artists/new', data: { breadcrumb: 'Artistes > Nouveau' }, loadComponent: () =>
          import('./pages/artists/form/artist-form.component').then(m => m.ArtistFormComponent)
      },
      { path: 'artists/:id', data: { breadcrumb: 'Artistes > :id' }, loadComponent: () =>
          import('./pages/artists/detail/artist-detail.component').then(m => m.ArtistDetailComponent)
      },
      { path: 'artists/edit/:id', data: { breadcrumb: 'Artistes > :id > Edit' }, loadComponent: () =>
          import('./pages/artists/form/artist-form.component').then(m => m.ArtistFormComponent)
      },

      { path: 'users', data: { breadcrumb: 'Users' }, loadComponent: () =>
          import('./pages/users/list/user-list.component').then(m => m.UserListComponent)
      },
      { path: 'users/:id', data: { breadcrumb: 'Users > :id' }, loadComponent: () =>
          import('./pages/users/detail/user-detail.component').then(m => m.UserDetailComponent)
      },

      { path: 'validations/artists', data: { breadcrumb: 'Validations > Artistes' }, loadComponent: () =>
          import('./pages/validations/artists/validation-artist-home/validation-artist-home.component').then(m => m.ValidationArtistHomeComponent)
      },
      { path: 'validations/artworks', data: { breadcrumb: 'Validations > Œuvres' }, loadComponent: () =>
          import('./pages/validations/artworks/validation-artwork-home/validation-artwork-home.component').then(m => m.ValidationArtworkHomeComponent)
      },
    ]
  }
];
