import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { FormErrorHandlerService } from '../../../../core/services/form-error-handler.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AppFormFieldComponent } from '../../../../shared/components/app-form-field.component/app-form-field.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload.component/file-upload.component';
import { BackButtonComponent } from '../../../../shared/components/back-button.component/back-button.component';
import { GlobalErrorAlertComponent } from '../../../../shared/components/global-error-alert.component/global-error-alert.component';
import { AppCountryAutocompleteComponent } from '../../../../shared/components/app-country-autocomplete.component/app-country-autocomplete.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-artist-edit',
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
  templateUrl: './artist-edit.component.html',
})
export class ArtistEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiPlatformService<any>);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private errorHandler = inject(FormErrorHandlerService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly apiBaseUrl = environment.apiBaseUrl;

  artistId = signal<string | null>(null);
  loading = signal(true);
  fileSignal = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  existingImageIri = signal<string | null>(null);
  submitting = signal(false);
  globalError = signal<string | null>(null);

  form = this.fb.group({
    firstname: ['', [Validators.required, Validators.maxLength(255)]],
    lastname: ['', [Validators.required, Validators.maxLength(255)]],
    nationality: ['', [Validators.maxLength(100)]],
    bornAt: ['', []],
    diedAt: ['', []],
    biography: ['', [Validators.maxLength(5000)]],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/my-submissions']);
      return;
    }
    this.artistId.set(id);
    this.loadArtist(id);
  }

  private loadArtist(id: string) {
    this.api.get('artists', id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (artist: any) => {
          // Vérifier que l'artiste appartient bien à l'utilisateur courant
          const currentUserId = this.authService.currentUser?.id;
          const createdById = artist.createdBy?.id ?? artist.createdBy;
          if (!this.authService.isAdmin() && createdById !== currentUserId) {
            this.router.navigate(['/my-submissions']);
            return;
          }
          this.form.patchValue({
            firstname: artist.firstname ?? '',
            lastname: artist.lastname ?? '',
            nationality: artist.nationality ?? '',
            bornAt: artist.bornAt?.slice(0, 10) ?? '',
            diedAt: artist.diedAt?.slice(0, 10) ?? '',
            biography: artist.biography ?? '',
          });
          if (artist.profilePicture?.contentUrl) {
            this.previewUrl.set(this.apiBaseUrl + artist.profilePicture.contentUrl);
            this.existingImageIri.set(artist.profilePicture['@id'] ?? null);
          }
          this.loading.set(false);
        },
        error: () => {
          this.toast.show('Impossible de charger l\'artiste', 'error');
          this.router.navigate(['/my-submissions']);
        }
      });
  }

  submit() {
    this.globalError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }
    this.submitting.set(true);

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

      this.api.patch('artists', this.artistId()!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.toast.show('Artiste modifié. Il repassera en validation.', 'success');
            this.router.navigate(['/my-submissions']);
          },
          error: (e: any) => {
            this.submitting.set(false);
            const globalError = this.errorHandler.handleApiError(e, this.form);
            this.globalError.set(globalError);
            this.toast.show('Erreur lors de la modification', 'error');
          }
        });
    };

    const file = this.fileSignal();
    if (file) {
      this.api.createFormData(file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (media: any) => proceed(media?.['@id'] ?? this.existingImageIri()),
          error: (e: any) => {
            this.submitting.set(false);
            const globalError = this.errorHandler.handleApiError(e, this.form);
            this.globalError.set(globalError);
          }
        });
    } else {
      proceed(this.existingImageIri());
    }
  }
}
