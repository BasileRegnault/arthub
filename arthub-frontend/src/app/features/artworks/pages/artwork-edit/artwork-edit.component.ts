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
import { AppArtistAutocompleteComponent } from '../../../../shared/components/app-artist-autocomplete.component/app-artist-autocomplete.component';
import { BackButtonComponent } from '../../../../shared/components/back-button.component/back-button.component';
import { GlobalErrorAlertComponent } from '../../../../shared/components/global-error-alert.component/global-error-alert.component';
import { AppCountryAutocompleteComponent } from '../../../../shared/components/app-country-autocomplete.component/app-country-autocomplete.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SimpleArtist } from '../../../../core/models';
import { ARTWORK_TYPE_OPTIONS, ARTWORK_STYLE_OPTIONS } from '../../../../core/models/enum/artwork-options';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-artwork-edit',
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
  templateUrl: './artwork-edit.component.html',
})
export class ArtworkEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiPlatformService<any>);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private errorHandler = inject(FormErrorHandlerService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly apiBaseUrl = environment.apiBaseUrl;

  artworkId = signal<string | null>(null);
  loading = signal(true);
  fileSignal = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  existingImageIri = signal<string | null>(null);
  submitting = signal(false);
  globalError = signal<string | null>(null);

  typeOptions = ARTWORK_TYPE_OPTIONS;
  styleOptions = ARTWORK_STYLE_OPTIONS;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    type: ['', [Validators.required]],
    style: ['', [Validators.required]],
    creationDate: ['', [Validators.required]],
    location: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    artist: [null as SimpleArtist | null, [Validators.required]],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/my-submissions']);
      return;
    }
    this.artworkId.set(id);
    this.loadArtwork(id);
  }

  private loadArtwork(id: string) {
    this.api.get('artworks', id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (artwork: any) => {
          const currentUserId = this.authService.currentUser?.id;
          const createdById = artwork.createdBy?.id ?? artwork.createdBy;
          if (!this.authService.isAdmin() && createdById !== currentUserId) {
            this.router.navigate(['/my-submissions']);
            return;
          }
          this.form.patchValue({
            title: artwork.title ?? '',
            type: artwork.type ?? '',
            style: artwork.style ?? '',
            creationDate: artwork.creationDate?.slice(0, 10) ?? '',
            location: artwork.location ?? '',
            description: artwork.description ?? '',
            artist: artwork.artist ?? null,
          });
          if (artwork.image?.contentUrl) {
            this.previewUrl.set(this.apiBaseUrl + artwork.image.contentUrl);
            this.existingImageIri.set(artwork.image['@id'] ?? null);
          }
          this.loading.set(false);
        },
        error: () => {
          this.toast.show('Impossible de charger l\'œuvre', 'error');
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

    const proceed = (imageIri: string | null) => {
      const artist = this.form.value.artist;
      const payload: any = {
        title: this.form.value.title,
        type: this.form.value.type,
        style: this.form.value.style,
        creationDate: this.form.value.creationDate || null,
        location: this.form.value.location || null,
        description: this.form.value.description || null,
        artist: artist ? `/api/artists/${(artist as SimpleArtist).id}` : null,
      };
      if (imageIri) {
        payload.image = imageIri;
      }

      this.api.patch('artworks', this.artworkId()!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.toast.show('Œuvre modifiée. Elle repassera en validation.', 'success');
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
