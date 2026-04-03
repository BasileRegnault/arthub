import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError, EMPTY } from 'rxjs';

let isRefreshing = false;

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Ces routes publiques n'ont pas besoin du token
  if (
    req.url.includes('/login') ||
    req.url.includes('/register') ||
    req.url.includes('/token/refresh')
  ) {
    return next(req);
  }

  // On n'attache le token que s'il est encore valide
  if (auth.isAuthenticated()) {
    const token = auth.token;
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
  }

  return next(req).pipe(
    catchError(err => {

      // Identifiants incorrects → pas de tentative de refresh, on laisse l'erreur remonter
      if (err.status === 401 && err.error?.message === 'Invalid credentials.') {
        return throwError(() => err);
      }

      // Token expiré → on tente un refresh une seule fois
      if (err.status === 401 && !isRefreshing) {
        isRefreshing = true;

        return auth.refreshToken().pipe(
          switchMap(res => {
            isRefreshing = false;
            auth.saveTokens(res.token, res.refresh_token);

            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.token}` }
            });

            return next(retryReq);
          }),
          catchError(() => {
            isRefreshing = false;

            // On redirige vers la connexion uniquement si l'utilisateur avait une session ouverte.
            // Un visiteur anonyme qui touche un endpoint protégé ne doit pas être renvoyé sur /login.
            const hadSession = !!localStorage.getItem('refresh_token');
            auth.logout();
            if (hadSession) {
              router.navigate(['/auth/login'], { queryParams: { reason: 'expired' } });
            }

            return EMPTY;
          })
        );
      }

      return throwError(() => err);
    })
  );
};
