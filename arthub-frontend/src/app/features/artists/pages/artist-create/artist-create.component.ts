import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap, of } from 'rxjs';
import { toSlugId } from '../../../../shared/utils/slugify';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { FormErrorHandlerService } from '../../../../core/services/form-error-handler.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AppFormFieldComponent } from '../../../../shared/components/app-form-field.component/app-form-field.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload.component/file-upload.component';
import { BackButtonComponent } from '../../../../shared/components/back-button.component/back-button.component';
import { GlobalErrorAlertComponent } from '../../../../shared/components/global-error-alert.component/global-error-alert.component';
import { AppCountryAutocompleteComponent } from '../../../../shared/components/app-country-autocomplete.component/app-country-autocomplete.component';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-artist-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppFormFieldComponent,
    FileUploadComponent,
    BackButtonComponent,
    GlobalErrorAlertComponent,
    AppCountryAutocompleteComponent
  ],
  templateUrl: './artist-create.component.html',
})
export class ArtistCreateComponent {
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
    firstname: ['', [Validators.required, Validators.maxLength(255)]],
    lastname: ['', [Validators.required, Validators.maxLength(255)]],
    nationality: ['', [Validators.maxLength(100)]],
    bornAt: ['', []],
    diedAt: ['', []],
    biography: ['', [Validators.maxLength(5000)]],
  });

  submit() {
    this.globalError.set(null);
    this.duplicateError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    this.submitting.set(true);

    const firstname = (this.form.value.firstname ?? '').trim();
    const lastname = (this.form.value.lastname ?? '').trim();

    // Vérification doublons : artistes existants ET en attente de validation
    this.api.list('artists', 1, 1, { firstname, lastname }).subscribe({
      next: (res: any) => {
        if (res.total > 0) {
          this.submitting.set(false);
          this.duplicateError.set(
            `Un artiste nommé "${firstname} ${lastname}" existe déjà ou est en cours de validation.`
          );
          return;
        }
        this.proceedWithUploadAndCreate();
      },
      error: () => {
        // En cas d'erreur API on laisse passer
        this.proceedWithUploadAndCreate();
      }
    });
  }

  private proceedWithUploadAndCreate() {
    const file = this.fileSignal();

    const proceed = (profilePictureIri: string | null) => {
      const payload: any = {
        firstname: this.form.value.firstname,
        lastname: this.form.value.lastname,
        nationality: this.form.value.nationality || null,
        bornAt: this.form.value.bornAt || null,
        diedAt: this.form.value.diedAt || null,
        biography: this.form.value.biography || null,
      };

      if (profilePictureIri) {
        payload.profilePicture = profilePictureIri;
      }

      this.api.create('artists', payload).subscribe({
        next: (artist: any) => {
          this.submitting.set(false);
          if (artist.isConfirmCreate === false) {
            this.toast.show('Artiste soumis ! Il sera publié après validation par notre équipe.', 'success');
            this.router.navigate(['/my-submissions']);
          } else {
            this.toast.show('Artiste créé avec succès', 'success');
            this.router.navigate(['/artists', toSlugId(artist.id, `${artist.firstname} ${artist.lastname}`)]);
          }
        },
        error: (e: any) => {
          this.submitting.set(false);
          this.handleApiError(e);
          this.toast.show('Erreur lors de la création de l\'artiste', 'error');
        }
      });
    };

    if (!file) {
      proceed(null);
      return;
    }

    this.api.createFormData(file).subscribe({
      next: (media: any) => {
        const iri = media?.['@id'] ?? null;
        proceed(iri);
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
