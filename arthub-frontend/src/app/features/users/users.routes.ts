import { Routes } from '@angular/router';
import { ProfileComponent } from './pages/profile/profile.component';
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';
import { authGuard } from '../../core/guards/auth.guard';

export const usersRoutes: Routes = [
  {
    path: '',
    component: ProfileComponent,
    canActivate: [authGuard]
  },
  {
    path: 'edit',
    component: EditProfileComponent,
    canActivate: [authGuard]
  }
];
