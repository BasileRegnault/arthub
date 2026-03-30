import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-form-field.component.html',
  styleUrl: './app-form-field.component.scss',
})
export class AppFormFieldComponent {
  @Input() label!: string;
  @Input() control!: FormControl;
  @Input() type: 'text' | 'textarea' | 'select' | 'date' | 'toggle' = 'text';
  @Input() options: any[] = [];
  @Input() errorMessage: string = 'Champ requis';
  @Input() placeholder?: string;

  getErrorMessage(): string {
    if (!this.control.errors) return '';

    if (this.control.errors['required']) {
      return `${this.label} est requis`;
    }

    if (this.control.errors['maxlength']) {
      const maxLength = this.control.errors['maxlength'].requiredLength;
      return `${this.label} ne peut pas dépasser ${maxLength} caractères`;
    }

    if (this.control.errors['minlength']) {
      const minLength = this.control.errors['minlength'].requiredLength;
      return `${this.label} doit contenir au moins ${minLength} caractères`;
    }

    if (this.control.errors['email']) {
      return 'Email invalide';
    }

    if (this.control.errors['pattern']) {
      return `${this.label} n'est pas au bon format`;
    }

    if (this.control.errors['min']) {
      const min = this.control.errors['min'].min;
      return `${this.label} doit être supérieur ou égal à ${min}`;
    }

    if (this.control.errors['max']) {
      const max = this.control.errors['max'].max;
      return `${this.label} doit être inférieur ou égal à ${max}`;
    }

    // Erreur serveur
    if (this.control.errors['server']) {
      return this.control.errors['server'];
    }

    // Erreur personnalisée
    if (this.control.errors['custom']) {
      return this.control.errors['custom'];
    }

    return `${this.label} est invalide`;
  }
}
