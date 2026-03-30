import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';

export type BreadcrumbItem = { label: string; url: string };

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly _breadcrumbs$ = new BehaviorSubject<BreadcrumbItem[]>([]);
  readonly breadcrumbs$ = this._breadcrumbs$.asObservable();

  constructor(private router: Router, private ar: ActivatedRoute) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const crumbs = this.buildFromLeaf();
        this._breadcrumbs$.next(crumbs);
      });
  }

  private buildFromLeaf(): BreadcrumbItem[] {
    let route = this.ar.root;
    while (route.firstChild) route = route.firstChild;

    const dataCrumb = route.snapshot.data?.['breadcrumb'];
    if (!dataCrumb) return [{ label: 'Admin', url: '/admin' }];

    const params = route.snapshot.paramMap;
    const replaced = String(dataCrumb).replace(':id', params.get('id') ?? ':id');

    const parts = replaced.split('>').map(s => s.trim()).filter(Boolean);

    const fullUrl = this.router.url;
    const urlSegs = fullUrl.split('?')[0].split('#')[0].split('/').filter(Boolean);

    const progressiveUrls: string[] = [];
    for (let i = 1; i <= urlSegs.length; i++) {
      progressiveUrls.push('/' + urlSegs.slice(0, i).join('/'));
    }

    const result: BreadcrumbItem[] = [];
    const lastUrl = progressiveUrls[progressiveUrls.length - 1] ?? '/admin';

    if (parts.length === 1) {
      return [{ label: parts[0], url: lastUrl }];
    }

    result.push({ label: 'Admin', url: '/admin' });

    const resourceUrl = '/' + urlSegs.slice(0, Math.min(2, urlSegs.length)).join('/');
    if (parts[0] !== 'Admin') {
      result.push({ label: parts[0], url: resourceUrl || '/admin' });
    }

    for (let i = 1; i < parts.length; i++) {
      result.push({ label: parts[i], url: lastUrl });
    }

    return result;
  }
}
