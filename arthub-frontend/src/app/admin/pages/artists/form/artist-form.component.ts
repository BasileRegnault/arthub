import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { Artist } from '../../../../core/models';
import { ToastService } from '../../../../shared/services/toast.service';
import { FileUploadComponent } from '../../../../shared/components/file-upload.component/file-upload.component';
import { BackButtonComponent } from '../../../../shared/components/back-button.component/back-button.component';
import { GlobalErrorAlertComponent } from '../../../../shared/components/global-error-alert.component/global-error-alert.component';
import { environment } from '../../../../environments/environment';
import { AppFormFieldComponent } from '../../../../shared/components/app-form-field.component/app-form-field.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { FormErrorHandlerService } from '../../../../core/services/form-error-handler.service';
import { RelatedEntitiesModalComponent, RelatedEntitiesData } from '../../../../shared/components/related-entities-modal.component/related-entities-modal.component';
import { ConstraintErrorHandlerService } from '../../../../core/services/constraint-error-handler.service';
import { AppCountryAutocompleteComponent } from '../../../../shared/components/app-country-autocomplete.component/app-country-autocomplete.component';

@Component({
  selector: 'app-artist-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, BackButtonComponent, AppFormFieldComponent, ConfirmModalComponent, GlobalErrorAlertComponent, RelatedEntitiesModalComponent, AppCountryAutocompleteComponent],
  templateUrl: './artist-form.component.html',
})
export class ArtistFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiPlatformService<Artist>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private errorHandler = inject(FormErrorHandlerService);
  private constraintErrorHandler = inject(ConstraintErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  isEdit = false;
  editingId: string | null = null;

  fileSignal = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  loading = signal(false);
  submitting = signal(false);
  globalError = signal<string | null>(null);

  // Modal de suppression
  confirmModalOpen = signal(false);
  artistToDeleteId: number | null = null;
  selectedArtistName = '';

  // Modal des entites liees
  relatedEntitiesModalOpen = signal(false);
  relatedEntitiesData: RelatedEntitiesData[] = [];
  relatedEntitiesTitle = '';
  relatedEntitiesMessage = '';

  form = this.fb.group({
    firstname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    lastname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    nationality: ['', Validators.maxLength(100)],
    bornAt: ['', Validators.required],
    diedAt: [''],
    biography: ['', Validators.maxLength(2000)],
    profilePicture: [''],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.editingId = id;
      this.loadArtist(id);
    }
  }

  loadArtist(id: string) {
    this.loading.set(true);
    this.api.get('artists', id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.form.patchValue({
          firstname: data.firstname,
          lastname: data.lastname,
          nationality: data.nationality,
          bornAt: data.bornAt?.slice(0,10),
          diedAt: data.diedAt?.slice(0,10),
          biography: data.biography,
          profilePicture: data.profilePicture?.['@id'] || ''
        });
        if (data.profilePicture?.contentUrl) {
          this.previewUrl.set(environment.apiBaseUrl + data.profilePicture.contentUrl);
        }
        this.loading.set(false);
      },
      error: (e: any) => {
        console.error('Erreur chargement artiste:', e);
        this.loading.set(false);
        this.handleApiError(e);
        this.toast.show('Erreur lors du chargement de l\'artiste', 'error');
      }
    });
  }

  onPreviewUpdate(file: File | null) {
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
    this.fileSignal.set(file);
  }

  submit() {
    // Reinitialiser l'erreur globale
    this.globalError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    this.submitting.set(true);
    const file = this.fileSignal();
    const existingProfilePictureIri = this.form.value.profilePicture ?? null;

    const proceed = (uploadedProfilePictureIri: string | null) => {
      const finalProfilePictureIri = uploadedProfilePictureIri ??
        (existingProfilePictureIri && existingProfilePictureIri.length ? existingProfilePictureIri : null);

      const payload = { ...this.form.value, profilePicture: finalProfilePictureIri };
      const request$ = this.isEdit && this.editingId
        ? this.api.patch('artists', this.editingId, payload)
        : this.api.create('artists', payload);

      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalError.set(null);
          this.toast.show('Artiste enregistré avec succès', 'success');
          this.router.navigate(['/admin/artists']);
        },
        error: (e: any) => {
          console.error('Erreur soumission artiste:', e);
          this.submitting.set(false);
          this.handleApiError(e);
          this.toast.show('Erreur lors de l\'enregistrement de l\'artiste', 'error');
        }
      });
    };

    if (!file) {
      proceed(null);
      return;
    }

    this.uploadMediaObject(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (media: any) => {
        const iri = media?.['@id'] ?? null;
        if (!iri) {
          this.submitting.set(false);
          this.globalError.set("L'upload de l'image a réussi mais l'IRI est manquante");
          this.toast.show("Upload OK mais IRI manquante côté serveur", 'error');
          return;
        }
        proceed(iri);
      },
      error: (e: any) => {
        console.error('Erreur upload image:', e);
        this.submitting.set(false);
        this.handleApiError(e);
        this.toast.show("Erreur lors de l'upload de l'image", 'error');
      }
    });
  }

  uploadMediaObject(file: File) {
    return this.api.createFormData(file);
  }

  // Suppression
  onDelete() {
    this.artistToDeleteId = this.editingId ? parseInt(this.editingId, 10) : null;
    this.selectedArtistName = this.form.value.firstname as string;
    this.confirmModalOpen.set(true);
  }

  handleConfirmDelete() {
    if (!this.artistToDeleteId) return;

    this.submitting.set(true);

    this.api.delete('artists', this.artistToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmModalOpen.set(false);
        this.globalError.set(null);
        this.toast.show('Artiste supprimé avec succès', 'success');
        this.router.navigate(['/admin/artists']);
      },
      error: (e: any) => {
        console.error('Erreur suppression artiste:', e);
        this.submitting.set(false);
        this.confirmModalOpen.set(false);

        // Vérifier si c'est une erreur de contrainte
        const constraintInfo = this.constraintErrorHandler.isConstraintError(e);
        if (constraintInfo.isConstraintError && this.artistToDeleteId) {
          // Charger les entités liées
          this.constraintErrorHandler.loadArtistRelatedEntities(this.artistToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (relatedData) => {
              if (relatedData.length > 0) {
                this.relatedEntitiesData = relatedData;
                this.relatedEntitiesTitle = 'Impossible de supprimer l\'artiste';
                this.relatedEntitiesMessage = `Cet artiste ne peut pas être supprimé car il est lié à d'autres entités. Veuillez d'abord supprimer ou modifier les entités suivantes :`;
                this.relatedEntitiesModalOpen.set(true);
              } else {
                this.handleApiError(e);
                this.toast.show('Impossible de supprimer l\'artiste', 'error');
              }
            },
            error: () => {
              this.handleApiError(e);
              this.toast.show('Impossible de supprimer l\'artiste', 'error');
            }
          });
        } else {
          this.handleApiError(e);
          this.toast.show('Impossible de supprimer l\'artiste', 'error');
        }
      }
    });
  }

  handleCancelDelete() {
    this.artistToDeleteId = null;
    this.confirmModalOpen.set(false);
  }

  closeRelatedEntitiesModal() {
    this.relatedEntitiesModalOpen.set(false);
    this.relatedEntitiesData = [];
  }

  /**
   * Gère les erreurs API en utilisant le service FormErrorHandlerService
   */
  private handleApiError(error: any): void {
    const globalError = this.errorHandler.handleApiError(error, this.form);
    this.globalError.set(globalError);
  }
}
