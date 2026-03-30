import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resourceId',
  standalone: true,
  pure: true,
})
export class ResourceIdPipe implements PipeTransform {

  transform(resource: any): string {
    if (!resource) return '';

    if (typeof resource === 'string') {
      return resource.split('/').filter(Boolean).pop() ?? '';
    }

    if (typeof resource === 'object' && resource.id != null) {
      return String(resource.id);
    }

    return '';
  }
}
