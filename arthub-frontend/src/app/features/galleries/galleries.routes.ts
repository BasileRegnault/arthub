import { Routes } from '@angular/router';
import { PublicGalleriesComponent } from './pages/public-galleries/public-galleries.component';
import { MyGalleriesComponent } from './pages/my-galleries/my-galleries.component';
import { GalleryDetailComponent } from './pages/gallery-detail/gallery-detail.component';
import { UserGalleriesComponent } from './pages/user-galleries/user-galleries.component';
import { authGuard } from '../../core/guards/auth.guard';

export const galleriesRoutes: Routes = [
  {
    path: '',
    component: PublicGalleriesComponent
  },
  {
    path: 'my-galleries',
    component: MyGalleriesComponent,
    canActivate: [authGuard]
  },
  {
    path: 'create',
    redirectTo: '/admin/galleries/create',
    pathMatch: 'full'
  },
  {
    path: 'user/:userId',
    component: UserGalleriesComponent
  },
  {
    path: ':id',
    component: GalleryDetailComponent
  }
];
