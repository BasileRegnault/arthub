import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { FormErrorHandlerService } from '../../../../core/services/form-error-handler.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AppFormFieldComponent } from '../../../../shared/components/app-form-field.component/app-form-field.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload.component/file-upload.component';
import { AppArtistAutocompleteComponent } from '../../../../shared/components/app-artist-autocomplete.component/app-artist-autocomplete.component';
import { BackButtonComponent } from '../../../../shared/components/back-button.component/back-button.component';
import { GlobalErrorAlertComponent } from '../../../../shared/components/global-error-alert.component/global-error-alert.component';
import { AppCountryAutocompleteComponent } from '../../../../shared/components/app-country-autocomplete.component/app-country-autocomplete.component';

@Component({
  selector: 'app-artwork-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppFormFieldComponent,
    FileUploadComponent,
    AppArtistAutocompleteComponent,
    BackButtonComponent,
    GlobalErrorAlertComponent,
    AppCountryAutocompleteComponent
  ],
  templateUrl: './artwork-create.component.html',
})
export class ArtworkCreateComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiPlatformService<any>);
  private router = inject(Router);
  private toast = inject(ToastService);
  private errorHandler = inject(FormErrorHandlerService);

  fileSignal = signal<File | null>(null);
  submitting = signal(false);
  globalError = signal<string | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    type: ['', [Validators.required]],
    style: ['', [Validators.required]],
    creationDate: ['', []],
    location: ['', [Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    artist: ['', [Validators.required]], // IRI
  });

  types = ['Peinture', 'Sculpture', 'Photographie', 'Dessin', 'Gravure', 'Installation'];
  styles = ['Abstrait', 'Réalisme', 'Impressionnisme', 'Moderne', 'Contemporain', 'Classique'];

  submit() {
    this.globalError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    const file = this.fileSignal();
    if (!file) {
      this.toast.show('Veuillez sélectionner une image', 'error');
      return;
    }

    this.submitting.set(true);

    // Upload de l'image d'abord
    this.api.createFormData(file).subscribe({
      next: (media: any) => {
        const imageIri = media?.['@id'];
        if (!imageIri) {
          this.submitting.set(false);
          this.globalError.set("L'upload de l'image a réussi mais l'IRI est manquante");
          return;
        }

        // Création de l'œuvre
        const payload = {
          title: this.form.value.title,
          type: this.form.value.type,
          style: this.form.value.style,
          creationDate: this.form.value.creationDate || null,
          location: this.form.value.location || null,
          description: this.form.value.description || null,
          artist: this.form.value.artist,
          image: imageIri,
        };

        this.api.create('artworks', payload).subscribe({
          next: (artwork: any) => {
            this.submitting.set(false);
            this.toast.show('Œuvre créée avec succès', 'success');
            this.router.navigate(['/artworks', artwork.id]);
          },
          error: (e: any) => {
            this.submitting.set(false);
            this.handleApiError(e);
            this.toast.show('Erreur lors de la création de l\'œuvre', 'error');
          }
        });
      },
      error: (e: any) => {
        this.submitting.set(false);
        this.handleApiError(e);
        this.toast.show('Erreur lors de l\'upload de l\'image', 'error');
      }
    });
  }

  private handleApiError(error: any) {
    const globalError = this.errorHandler.handleApiError(error, this.form);
    this.globalError.set(globalError);
  }
}
