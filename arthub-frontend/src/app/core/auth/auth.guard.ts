import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Valide que l'URL de retour est bien relative à notre application (évite les redirections ouvertes) */
function isSafeReturnUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    const returnUrl = isSafeReturnUrl(router.url) ? router.url : '/';
    router.navigate(['/auth/login'], { queryParams: { returnUrl } });
    return false;
  }

  return true;
};
