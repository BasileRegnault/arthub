import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap, throwError, Observable, shareReplay, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

interface LoginResponse {
  token: string;
  refresh_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // On garde une seule requête en vol pour éviter les appels dupliqués à /me
  private meRequest$: Observable<User> | null = null;

  user = signal<User | null>(null);
  userLoading = signal<boolean>(false);
  userLoaded = signal<boolean>(false);

  constructor() {
    // Si l'utilisateur a déjà un token valide, on charge son profil dès le démarrage
    if (this.isAuthenticated()) {
      this.loadCurrentUser();
    }
  }

  // ── Connexion ──────────────────────────────────────────────────────────────
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, { email, password }).pipe(
      tap(res => this.saveTokens(res.token, res.refresh_token)),
      tap(() => this.fetchMe().subscribe())
    );
  }

  // ── Inscription (la connexion automatique est gérée par le composant) ──────
  register(email: string, username: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/register`, { email, username, password });
  }

  // ── Renouvellement du token ────────────────────────────────────────────────
  refreshToken(): Observable<LoginResponse> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      return throwError(() => new Error('Aucun refresh token disponible'));
    }

    return this.http.post<LoginResponse>(`${this.api}/token/refresh`, {
      refresh_token: refresh
    }).pipe(
      tap(res => this.saveTokens(res.token, res.refresh_token))
    );
  }

  // ── Gestion des tokens ─────────────────────────────────────────────────────
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

  // ── Profil utilisateur ─────────────────────────────────────────────────────
  get token(): string | null {
    return localStorage.getItem('token');
  }

  get currentUser(): User | null {
    return this.user();
  }

  /**
   * Charge le profil de l'utilisateur connecté depuis /me.
   * Si une requête est déjà en cours, on la réutilise plutôt qu'en lancer une nouvelle.
   */
  loadCurrentUser(): Observable<User | null> {
    // Déjà chargé, pas besoin de refaire un appel
    if (this.userLoaded() && this.user()) {
      return of(this.user());
    }

    // Une requête est déjà en vol, on s'y accroche
    if (this.meRequest$) {
      return this.meRequest$;
    }

    this.userLoading.set(true);

    // L'API peut renvoyer le profil en format plat { id, email, ... }
    // ou imbriqué { email, roles, user: { id, ... } } — on gère les deux
    this.meRequest$ = this.http.get<User & { user?: User }>(`${this.api}/me`).pipe(
      tap(response => {
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

  /** Alias pour compatibilité avec le reste du code */
  fetchMe(): Observable<User | null> {
    return this.loadCurrentUser();
  }

  /**
   * Version Promise de loadCurrentUser — pratique dans les guards et resolvers
   */
  async getCurrentUserAsync(): Promise<User | null> {
    if (this.userLoaded() && this.user()) return this.user();

    try {
      return await firstValueFrom(this.loadCurrentUser());
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const payload = this.decodeJwt();
    return !!payload && payload.exp * 1000 > Date.now();
  }

  /** Vérifie si l'utilisateur possède un rôle donné */
  hasRole(role: string): boolean {
    return this.user()?.roles?.includes(role) ?? false;
  }

  /** Raccourci pour vérifier si l'utilisateur est administrateur */
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
