import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiResourceHelperService {

  /** Retourne l'id depuis une IRI "/api/users/12" ou un objet { id: 12 } */
  getId(resource: any): string {
    if (!resource) return '';

    if (typeof resource === 'string') {
      return resource.split('/').filter(Boolean).pop() ?? '';
    }

    if (typeof resource === 'object' && resource.id != null) {
      return String(resource.id);
    }

    return '';
  }

  /** Retourne un libellé lisible (username/title/name...) avec fallback */
  getLabel(resource: any, field: string = 'username', prefix: string = 'ID'): string {
    if (!resource) return '—';

    if (typeof resource === 'object') {
      const value = resource?.[field];
      if (value != null && value !== '') return String(value);
      const id = this.getId(resource);
      return id ? `${prefix} #${id}` : '—';
    }

    // string IRI
    const id = this.getId(resource);
    return id ? `${prefix} #${id}` : '—';
  }

  /** Helpers dédiés User (lisibilité dans les templates) */
  getUserId(user: any): string {
    return this.getId(user);
  }

  getUsername(user: any): string {
    return this.getLabel(user, 'username', 'User');
  }
}
