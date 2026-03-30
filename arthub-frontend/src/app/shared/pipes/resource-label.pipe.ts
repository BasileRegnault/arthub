import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resourceLabel',
  standalone: true,
  pure: true,
})
export class ResourceLabelPipe implements PipeTransform {

  transform(
    resource: any,
    field: string = 'username',
    prefix: string = 'ID'
  ): string {
    if (!resource) return '—';

    if (typeof resource === 'object') {
      const value = resource?.[field];
      if (value != null && value !== '') {
        return String(value);
      }

      const id = resource.id;
      if (id != null) {
        return `${prefix} #${id}`;
      }
    }

    // IRI sous forme de chaine
    if (typeof resource === 'string') {
      const id = resource.split('/').filter(Boolean).pop();
      return id ? `${prefix} #${id}` : '—';
    }

    return '—';
  }
}
