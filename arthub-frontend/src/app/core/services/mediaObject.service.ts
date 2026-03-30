import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MediaObject } from '../models/mediaObject.model';

@Injectable({ providedIn: 'root' })
export class MediaObjectService {
  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<MediaObject> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MediaObject>('/api/media_objects', formData);
  }
}
