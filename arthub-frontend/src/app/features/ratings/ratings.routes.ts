import { Routes } from '@angular/router';
import { MyRatingsComponent } from './pages/my-ratings/my-ratings.component';

export const ratingsRoutes: Routes = [
  {
    path: 'my-ratings',
    component: MyRatingsComponent,
    // canActivate: [authGuard]  // À ajouter plus tard
  }
];
