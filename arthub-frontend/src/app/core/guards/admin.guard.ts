import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Guard pour les routes admin
 * Nécessite ROLE_ADMIN
 * Redirige vers /auth/login si non connecté
 * Redirige vers / si connecté mais pas admin
 */
export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Vérifier si authentifié
  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: router.url }
    });
    return false;
  }

  // S'assurer que l'utilisateur est chargé
  if (!authService.userLoaded()) {
    try {
      await authService.getCurrentUserAsync();
    } catch {
      router.navigate(['/auth/login']);
      return false;
    }
  }

  // Vérifier le rôle admin
  if (!authService.isAdmin()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
