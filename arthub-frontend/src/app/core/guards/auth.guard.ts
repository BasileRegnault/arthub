import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Guard pour les routes nécessitant une authentification (contributeurs)
 * Redirige vers /auth/login si non connecté
 */
export const authGuard: CanActivateFn = async () => {
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

  return true;
};
