import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dateDisplay' })
export class DateDisplayPipe implements PipeTransform {
  transform(value?: string, includeTime = false): string {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + (includeTime ? ' - ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
  }
}