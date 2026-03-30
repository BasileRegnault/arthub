import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap, throwError, Observable, shareReplay, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

// Mock user pour le mode dev bypass (uniquement en développement)
const DEV_MOCK_USER: User = {
  id: 1,
  username: 'DevUser',
  email: 'dev@arthub.local',
  roles: ['ROLE_USER', 'ROLE_ADMIN'],
  isSuspended: false
};

interface LoginResponse {
  token: string;
  refresh_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // Cache pour éviter les appels multiples à /me
  private meRequest$: Observable<User> | null = null;

  user = signal<User | null>(null);
  userLoading = signal<boolean>(false);
  userLoaded = signal<boolean>(false);

  constructor() {
    // Charger automatiquement l'utilisateur si un token valide existe
    if (this.isAuthenticated()) {
      this.loadCurrentUser();
    }
  }

  /**
   * Vérifie si le mode dev bypass est actif
   * Fonctionne uniquement si production=false ET devBypassAuth=true
   */
  private get isDevBypassActive(): boolean {
    return !environment.production && (environment as any).devBypassAuth === true;
  }

  // ---------- LOGIN ----------
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, {
      email,
      password
    }).pipe(
      tap(res => this.saveTokens(res.token, res.refresh_token)),
      tap(() => this.fetchMe().subscribe())
    );
  }

  // ---------- REGISTER (sans auto-login, le composant s'en charge) ----------
  register(email: string, username: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/register`, {
      email,
      username,
      password
    });
  }

  // ---------- REFRESH ----------
  refreshToken(): Observable<LoginResponse> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post<LoginResponse>(`${this.api}/token/refresh`, {
      refresh_token: refresh
    }).pipe(
      tap(res => this.saveTokens(res.token, res.refresh_token))
    );
  }

  // ---------- TOKEN STORAGE ----------
  saveTokens(token: string, refresh?: string) {
    localStorage.setItem('token', token);
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    this.user.set(null);
    this.userLoaded.set(false);
    this.userLoading.set(false);
    this.meRequest$ = null;
  }

  // ---------- USER ----------
  get token(): string | null {
    return localStorage.getItem('token');
  }

  get currentUser(): User | null {
    if (this.isDevBypassActive) return DEV_MOCK_USER;
    return this.user();
  }

  /**
   * Charge l'utilisateur courant depuis /me
   * Utilise un cache pour éviter les appels multiples simultanés
   */
  loadCurrentUser(): Observable<User | null> {
    // Mode dev bypass
    if (this.isDevBypassActive) {
      this.user.set(DEV_MOCK_USER);
      this.userLoaded.set(true);
      return of(DEV_MOCK_USER);
    }

    // Si déjà chargé, retourner l'utilisateur
    if (this.userLoaded() && this.user()) {
      return of(this.user());
    }

    // Si une requête est déjà en cours, la réutiliser
    if (this.meRequest$) {
      return this.meRequest$;
    }

    this.userLoading.set(true);

    // Créer et cacher la requête
    this.meRequest$ = this.http.get<User & { user?: User }>(`${this.api}/me`).pipe(
      tap(response => {
        // Gérer les deux formats possibles :
        // 1. Format plat : { id, email, username, roles, ... }
        // 2. Format imbriqué : { email, roles, user: { id, ... } }
        const userData = response.user ?? response;

        this.user.set(userData);
        this.userLoaded.set(true);
        this.userLoading.set(false);
        this.meRequest$ = null;
      }),
      catchError(err => {
        this.user.set(null);
        this.userLoaded.set(true);
        this.userLoading.set(false);
        this.meRequest$ = null;
        return throwError(() => err);
      }),
      shareReplay(1)
    );

    return this.meRequest$;
  }

  /**
   * Alias pour compatibilité - utilise loadCurrentUser
   */
  fetchMe(): Observable<User | null> {
    return this.loadCurrentUser();
  }

  /**
   * Récupère l'utilisateur de manière asynchrone (Promise)
   * Utile pour les guards et resolvers
   */
  async getCurrentUserAsync(): Promise<User | null> {
    if (this.isDevBypassActive) return DEV_MOCK_USER;
    if (this.userLoaded() && this.user()) return this.user();

    try {
      return await firstValueFrom(this.loadCurrentUser());
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    // Mode dev bypass : toujours retourner true si le bypass est actif
    if (this.isDevBypassActive) {
      return true;
    }

    const payload = this.decodeJwt();
    return !!payload && payload.exp * 1000 > Date.now();
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    if (this.isDevBypassActive) {
      return DEV_MOCK_USER.roles.includes(role);
    }

    const currentUser = this.user();
    if (!currentUser?.roles) return false;
    return currentUser.roles.includes(role);
  }

  /**
   * Vérifie si l'utilisateur est admin
   */
  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  decodeJwt(): { exp: number; [key: string]: unknown } | null {
    const token = this.token;
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
