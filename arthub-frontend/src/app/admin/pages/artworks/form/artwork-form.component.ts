import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SimpleArtist } from '../../../../core/models';
import { ARTWORK_TYPE_OPTIONS, ARTWORK_STYLE_OPTIONS } from '../../../../core/models/enum/artwork-options';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { FileUploadComponent } from "../../../../shared/components/file-upload.component/file-upload.component";
import { AppFormFieldComponent } from "../../../../shared/components/app-form-field.component/app-form-field.component";
import { BackButtonComponent } from "../../../../shared/components/back-button.component/back-button.component";
import { AppArtistAutocompleteComponent } from '../../../../shared/components/app-artist-autocomplete.component/app-artist-autocomplete.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { GlobalErrorAlertComponent } from '../../../../shared/components/global-error-alert.component/global-error-alert.component';
import { FormErrorHandlerService } from '../../../../core/services/form-error-handler.service';
import { ArtworkFormControls } from '../../../../core/models/form/artwork.form.model';
import { RelatedEntitiesModalComponent, RelatedEntitiesData } from '../../../../shared/components/related-entities-modal.component/related-entities-modal.component';
import { ConstraintErrorHandlerService } from '../../../../core/services/constraint-error-handler.service';
import { AppCountryAutocompleteComponent } from '../../../../shared/components/app-country-autocomplete.component/app-country-autocomplete.component';

@Component({
  selector: 'app-artwork-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    FileUploadComponent, AppFormFieldComponent, BackButtonComponent,
    AppArtistAutocompleteComponent, ConfirmModalComponent, GlobalErrorAlertComponent, RelatedEntitiesModalComponent,
    AppCountryAutocompleteComponent
  ],
  templateUrl: './artwork-form.component.html',
})
export class ArtworkFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiPlatformService<any>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private errorHandler = inject(FormErrorHandlerService);
  private constraintErrorHandler = inject(ConstraintErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  isEdit = false;
  editingId: string | null = null;

  // Upload de fichier
  fileSignal = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  // Chargement / soumission
  loading = signal(false);
  submitting = signal(false);
  globalError = signal<string | null>(null);

  // Modal de suppression
  confirmModalOpen = signal(false);
  artworkToDeleteId: number | null = null;
  selectedArtworkTitle = '';

  // Modal des entites liees
  relatedEntitiesModalOpen = signal(false);
  relatedEntitiesData: RelatedEntitiesData[] = [];
  relatedEntitiesTitle = '';
  relatedEntitiesMessage = '';

  // Formulaire
  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255), Validators.minLength(2)]],
    type: ['', Validators.required],
    style: ['', Validators.required],
    creationDate: ['', Validators.required],
    description: ['', Validators.maxLength(1000)],
    image: [''],
    location: ['', Validators.maxLength(255)],
    artist: [null as SimpleArtist | null, Validators.required],
    isDisplay: [true],
  });

  typeOptions = ARTWORK_TYPE_OPTIONS;
  styleOptions = ARTWORK_STYLE_OPTIONS;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.editingId = id;
      this.loadArtwork(id);
    }
  }

  loadArtwork(id: string) {
    this.loading.set(true);
    this.api.get('artworks', id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data: any) => {
        this.form.patchValue({
          title: data.title,
          type: data.type,
          style: data.style,
          creationDate: data.creationDate?.slice(0,10) ?? '',
          description: data.description,
          image: data.image ?? '',
          location: data.location ?? '',
          artist: data.artist ?? null,
          isDisplay: data.isDisplay ?? true,
        });

        if (data.image?.contentUrl) {
          this.previewUrl.set(environment.apiBaseUrl + data.image.contentUrl);
          this.form.controls['image'].setValue(data.image['@id']);
        }
        this.loading.set(false);
      },
      error: (e: any) => {
        console.error('Erreur chargement œuvre:', e);
        this.loading.set(false);
        this.handleApiError(e);
        this.toast.show('Erreur lors du chargement de l\'œuvre', 'error');
      }
    });
  }

  onPreviewUpdate(file: File | null) {
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
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
    const existingImageIri = this.form.value.image ?? null;

    const proceed = (uploadedImageIri: string | null) => {
      const finalImageIri = uploadedImageIri ?? (existingImageIri && existingImageIri.length ? existingImageIri : null);

      const payload = {
        title: this.form.value.title,
        type: this.form.value.type,
        style: this.form.value.style,
        creationDate: this.form.value.creationDate,
        description: this.form.value.description,
        location: this.form.value.location,
        artist: this.form.value.artist ? `/api/artists/${this.form.value.artist.id}` : null,
        isDisplay: this.form.value.isDisplay,
        image: finalImageIri,
      };

      const request$ = this.isEdit && this.editingId
        ? this.api.patch('artworks', this.editingId, payload)
        : this.api.create('artworks', payload);

      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalError.set(null);
          this.toast.show('Œuvre enregistrée avec succès', 'success');
          this.router.navigate(['/admin/artworks']);
        },
        error: (err: any) => {
          console.error('Erreur soumission œuvre:', err);
          this.submitting.set(false);
          this.handleApiError(err);
          this.toast.show('Erreur lors de l\'enregistrement de l\'œuvre', 'error');
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

  // Suppression
  onDelete() {
    this.artworkToDeleteId = this.editingId ? parseInt(this.editingId, 10) : null;
    this.selectedArtworkTitle = this.form.value.title as string;
    this.confirmModalOpen.set(true);
  }

  handleConfirmDelete() {
    if (!this.artworkToDeleteId) return;

    this.submitting.set(true);

    this.api.delete('artworks', this.artworkToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmModalOpen.set(false);
        this.globalError.set(null);
        this.toast.show('Œuvre supprimée avec succès', 'success');
        this.router.navigate(['/admin/artworks']);
      },
      error: (e: any) => {
        console.error('Erreur suppression œuvre:', e);
        this.submitting.set(false);
        this.confirmModalOpen.set(false);

        // Vérifier si c'est une erreur de contrainte
        const constraintInfo = this.constraintErrorHandler.isConstraintError(e);
        if (constraintInfo.isConstraintError && this.artworkToDeleteId) {
          // Charger les entités liées
          this.constraintErrorHandler.loadArtworkRelatedEntities(this.artworkToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (relatedData) => {
              if (relatedData.length > 0) {
                this.relatedEntitiesData = relatedData;
                this.relatedEntitiesTitle = 'Impossible de supprimer l\'œuvre';
                this.relatedEntitiesMessage = `Cette œuvre ne peut pas être supprimée car elle est liée à d'autres entités. Veuillez d'abord supprimer ou modifier les entités suivantes :`;
                this.relatedEntitiesModalOpen.set(true);
              } else {
                this.handleApiError(e);
                this.toast.show('Impossible de supprimer l\'œuvre', 'error');
              }
            },
            error: () => {
              this.handleApiError(e);
              this.toast.show('Impossible de supprimer l\'œuvre', 'error');
            }
          });
        } else {
          this.handleApiError(e);
          this.toast.show('Impossible de supprimer l\'œuvre', 'error');
        }
      }
    });
  }

  handleCancelDelete() {
    this.artworkToDeleteId = null;
    this.confirmModalOpen.set(false);
  }

  closeRelatedEntitiesModal() {
    this.relatedEntitiesModalOpen.set(false);
    this.relatedEntitiesData = [];
  }

  uploadMediaObject(file: File) {
    return this.api.createFormData(file);
  }

  /**
   * Gère les erreurs API en utilisant le service FormErrorHandlerService
   */
  private handleApiError(error: any): void {
    const globalError = this.errorHandler.handleApiError(error, this.form);
    this.globalError.set(globalError);
  }
}
