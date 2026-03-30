import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
  duration?: number; // ms
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<ToastMessage[]>([]);
  private nextId = 0;

  get toasts() {
    return this._toasts;
  }

  show(message: string, type: 'success' | 'error' = 'success', duration = 5000) {
    const id = this.nextId++;
    const toast: ToastMessage = { id, message, type, duration };
    this._toasts.set([...this._toasts(), toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  dismiss(id: number) {
    this._toasts.set(this._toasts().filter(t => t.id !== id));
  }
}
