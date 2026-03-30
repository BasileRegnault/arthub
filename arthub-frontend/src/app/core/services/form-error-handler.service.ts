import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

export interface ApiErrorResult {
  globalError: string | null;
  fieldErrors: { [key: string]: string };
}

/**
 * Service réutilisable pour gérer les erreurs API et les attacher aux formulaires
 */
@Injectable({
  providedIn: 'root'
})
export class FormErrorHandlerService {

  /**
   * Parse les erreurs API Platform et les attache au formulaire
   * @param error L'erreur HTTP reçue de l'API
   * @param form Le formulaire Angular auquel attacher les erreurs
   * @returns L'erreur globale à afficher (si applicable)
   */
  handleApiError(error: any, form?: FormGroup): string | null {
    const result = this.parseApiError(error);

    // Attacher les erreurs aux champs du formulaire
    if (form) {
      this.attachFieldErrors(form, result.fieldErrors);
    }

    return result.globalError;
  }

  /**
   * Parse les erreurs de l'API sans les attacher à un formulaire
   * @param error L'erreur HTTP
   * @returns Un objet contenant l'erreur globale et les erreurs par champ
   */
  parseApiError(error: any): ApiErrorResult {
    let globalError: string | null = null;
    const fieldErrors: { [key: string]: string } = {};

    if (!error) {
      return { globalError: 'Une erreur inattendue est survenue', fieldErrors };
    }

    // Erreur API Platform (format Hydra)
    if (error.error) {
      const errorData = error.error;

      // Message d'erreur global
      if (errorData['hydra:description']) {
        globalError = errorData['hydra:description'];
      } else if (errorData.message) {
        globalError = errorData.message;
      } else if (errorData.detail) {
        globalError = errorData.detail;
      }

      // Violations de contraintes (API Platform)
      if (errorData.violations && Array.isArray(errorData.violations)) {
        errorData.violations.forEach((violation: any) => {
          const propertyPath = violation.propertyPath;
          const message = violation.message;

          if (propertyPath) {
            fieldErrors[propertyPath] = message;
          } else {
            // Si pas de champ spécifique, ajouter à l'erreur globale
            globalError = globalError ? `${globalError}\n${message}` : message;
          }
        });
      }
    }

    // Erreur HTTP générique (si pas d'erreur globale définie)
    if (!globalError && error.status) {
      globalError = this.getHttpErrorMessage(error.status);
    }

    // Si toujours pas d'erreur globale
    if (!globalError) {
      globalError = 'Une erreur est survenue lors de la communication avec le serveur';
    }

    return { globalError, fieldErrors };
  }

  /**
   * Attache les erreurs aux contrôles de formulaire
   * @param form Le formulaire Angular
   * @param fieldErrors Les erreurs par champ
   */
  private attachFieldErrors(form: FormGroup, fieldErrors: { [key: string]: string }): void {
    // Reset les erreurs serveur existantes
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && control.errors && control.errors['server']) {
        const { server, ...otherErrors } = control.errors;
        control.setErrors(Object.keys(otherErrors).length > 0 ? otherErrors : null);
      }
    });

    // Attacher les nouvelles erreurs
    Object.keys(fieldErrors).forEach(fieldName => {
      if (form.contains(fieldName)) {
        const control = form.get(fieldName);
        if (control) {
          control.setErrors({
            ...control.errors,
            server: fieldErrors[fieldName]
          });
          control.markAsTouched();
        }
      }
    });
  }

  /**
   * Obtient un message d'erreur basé sur le code HTTP
   * @param status Le code de statut HTTP
   * @returns Un message d'erreur approprié
   */
  private getHttpErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Données invalides. Veuillez vérifier le formulaire.';
      case 401:
        return 'Non autorisé. Veuillez vous reconnecter.';
      case 403:
        return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
      case 404:
        return 'Ressource introuvable.';
      case 409:
        return 'Conflit. Cette ressource existe déjà.';
      case 422:
        return 'Données non valides. Veuillez corriger les erreurs.';
      case 500:
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      case 503:
        return 'Service temporairement indisponible. Veuillez réessayer plus tard.';
      default:
        return 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  /**
   * Réinitialise toutes les erreurs serveur d'un formulaire
   * @param form Le formulaire à nettoyer
   */
  clearServerErrors(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && control.errors && control.errors['server']) {
        const { server, ...otherErrors } = control.errors;
        control.setErrors(Object.keys(otherErrors).length > 0 ? otherErrors : null);
      }
    });
  }
}
