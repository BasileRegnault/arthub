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
import { SimpleArtist } from '../../../../core/models';
import { ARTWORK_TYPE_OPTIONS, ARTWORK_STYLE_OPTIONS } from '../../../../core/models/enum/artwork-options';
import { toSlugId } from '../../../../shared/utils/slugify';
import { AuthService } from '../../../../core/auth/auth.service';

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
  private authService = inject(AuthService);

  get isAdmin(): boolean {
    return this.authService.currentUser?.roles?.includes('ROLE_ADMIN') ?? false;
  }

  fileSignal = signal<File | null>(null);
  submitting = signal(false);
  globalError = signal<string | null>(null);
  duplicateError = signal<string | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    type: ['', [Validators.required]],
    style: ['', [Validators.required]],
    creationDate: ['', [Validators.required]],
    location: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    artist: [null as SimpleArtist | null, [Validators.required]],
  });

  typeOptions = ARTWORK_TYPE_OPTIONS;
  styleOptions = ARTWORK_STYLE_OPTIONS;

  submit() {
    this.globalError.set(null);
    this.duplicateError.set(null);

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

    const title = (this.form.value.title ?? '').trim();
    const artist = this.form.value.artist;
    const artistIri = artist ? `/api/artists/${artist.id}` : null;

    // Vérification doublon : même titre + même artiste (validé ou en attente)
    const filters: any = { title };
    if (artistIri) filters['artist'] = artistIri;

    this.api.list('artworks', 1, 1, filters).subscribe({
      next: (res: any) => {
        if (res.total > 0) {
          this.submitting.set(false);
          const artistName = artist ? `${artist.firstname} ${artist.lastname}` : '';
          this.duplicateError.set(
            `Une œuvre intitulée "${title}"${artistName ? ` de ${artistName}` : ''} existe déjà ou est en cours de validation.`
          );
          return;
        }
        this.proceedWithUpload(artistIri, file);
      },
      error: () => {
        this.proceedWithUpload(artistIri, file);
      }
    });
  }

  private proceedWithUpload(artistIri: string | null, file: File) {
    this.api.createFormData(file).subscribe({
      next: (media: any) => {
        const imageIri = media?.['@id'];
        if (!imageIri) {
          this.submitting.set(false);
          this.globalError.set("L'upload de l'image a réussi mais l'IRI est manquante");
          return;
        }
        this.createArtwork(artistIri, imageIri);
      },
      error: (e: any) => {
        this.submitting.set(false);
        this.handleApiError(e);
        this.toast.show('Erreur lors de l\'upload de l\'image', 'error');
      }
    });
  }

  private createArtwork(artistIri: string | null, imageIri: string) {
    const payload = {
      title: this.form.value.title,
      type: this.form.value.type,
      style: this.form.value.style,
      creationDate: this.form.value.creationDate || null,
      location: this.form.value.location || null,
      description: this.form.value.description || null,
      artist: artistIri,
      image: imageIri,
    };

    this.api.create('artworks', payload).subscribe({
      next: (artwork: any) => {
        this.submitting.set(false);
        if (artwork.isConfirmCreate === false) {
          this.toast.show('Œuvre soumise ! Elle sera publiée après validation par notre équipe.', 'success');
          this.router.navigate(['/my-submissions']);
        } else {
          this.toast.show('Œuvre créée avec succès', 'success');
          this.router.navigate(['/artworks', toSlugId(artwork.id, artwork.title)]);
        }
      },
      error: (e: any) => {
        this.submitting.set(false);
        this.handleApiError(e);
        this.toast.show('Erreur lors de la création de l\'œuvre', 'error');
      }
    });
  }

  resetForm() {
    this.form.reset({
      title: '',
      type: '',
      style: '',
      creationDate: '',
      location: '',
      description: '',
      artist: null,
    });
    this.fileSignal.set(null);
    this.globalError.set(null);
    this.duplicateError.set(null);
  }

  private handleApiError(error: any) {
    const globalError = this.errorHandler.handleApiError(error, this.form);
    this.globalError.set(globalError);
  }
}
