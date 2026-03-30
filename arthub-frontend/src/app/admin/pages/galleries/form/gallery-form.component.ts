import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AppFormFieldComponent } from '../../../../shared/components/app-form-field.component/app-form-field.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component/confirm-modal.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload.component/file-upload.component';
import { BackButtonComponent } from '../../../../shared/components/back-button.component/back-button.component';
import { AppArtworkSelectorComponent } from '../../../../shared/components/app-artwork-selector.component/app-artwork-selector.component';
import { GlobalErrorAlertComponent } from '../../../../shared/components/global-error-alert.component/global-error-alert.component';

import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { FormErrorHandlerService } from '../../../../core/services/form-error-handler.service';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../../shared/services/toast.service';
import { RelatedEntitiesModalComponent, RelatedEntitiesData } from '../../../../shared/components/related-entities-modal.component/related-entities-modal.component';
import { ConstraintErrorHandlerService } from '../../../../core/services/constraint-error-handler.service';

type GalleryDto = {
  '@id'?: string;
  id?: number;
  name?: string;
  description?: string | null;
  isPublic?: boolean | null;
  coverImage?: { '@id'?: string; contentUrl?: string } | null;
  artworks?: Array<{ '@id': string }> | string[] | null;
};

@Component({
  selector: 'app-gallery-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FileUploadComponent,
    AppFormFieldComponent,
    BackButtonComponent,
    ConfirmModalComponent,
    AppArtworkSelectorComponent,
    GlobalErrorAlertComponent,
    RelatedEntitiesModalComponent,
  ],
  templateUrl: './gallery-form.component.html',
  styleUrls: ['./gallery-form.component.scss'],
})
export class GalleryFormComponent implements OnInit {
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

  // Upload d'image
  fileSignal = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  // Etats de l'interface
  submitting = signal(false);
  globalError = signal<string | null>(null);

  // Modal de suppression
  confirmModalOpen = signal(false);
  galleryToDeleteId: number | null = null;
  selectedGalleryName = '';

  // Modal des entites liees
  relatedEntitiesModalOpen = signal(false);
  relatedEntitiesData: RelatedEntitiesData[] = [];
  relatedEntitiesTitle = '';
  relatedEntitiesMessage = '';

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255), Validators.minLength(2)]],
    description: ['', [Validators.maxLength(500)]],
    isPublic: [true, [Validators.required]],
    // stocke uniquement l'IRI mediaObject (string) ou null
    coverImage: [null as string | null],
    // stocke les IRIs des artworks (string[]) ou null
    artworks: this.fb.control<string[] | null>(null),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.editingId = id;
      this.loadGallery(id);
    }
  }

  private loadGallery(id: string): void {
    this.submitting.set(true);

    this.api.get('galleries', id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data: GalleryDto) => {
        // Extraire les IRI des oeuvres
        let artworksIris: string[] | null = null;
        if (data.artworks && Array.isArray(data.artworks)) {
          artworksIris = data.artworks.map(a =>
            typeof a === 'string' ? a : a['@id']
          );
        }

        this.form.patchValue({
          name: data.name ?? '',
          description: data.description ?? '',
          isPublic: !!data.isPublic,
          coverImage: data.coverImage?.['@id'] ?? null,
          artworks: artworksIris,
        });

        // Apercu de l'image si existante
        const contentUrl = data.coverImage?.contentUrl;
        if (contentUrl) {
          this.previewUrl.set(environment.apiBaseUrl + contentUrl);
        } else {
          this.previewUrl.set(null);
        }

        this.submitting.set(false);
      },
      error: (e: any) => {
        console.error('Erreur chargement galerie:', e);
        this.submitting.set(false);
        this.handleApiError(e);
        this.toast.show('Erreur lors du chargement de la galerie', 'error');
      },
    });
  }

  submit(): void {
    // Reinitialiser l'erreur globale
    this.globalError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    this.submitting.set(true);

    const file = this.fileSignal();
    const existingCoverIri = this.form.value.coverImage ?? null;

    const proceed = (uploadedIri: string | null) => {
      // Si upload => on utilise l’IRI uploadée, sinon on garde l’existante, sinon null
      const finalCoverIri =
        uploadedIri ?? (existingCoverIri && existingCoverIri.length ? existingCoverIri : null);

      const payload = {
        name: this.form.value.name ?? '',
        description: this.form.value.description ?? '',
        isPublic: !!this.form.value.isPublic,
        coverImage: finalCoverIri, // string IRI ou null
        artworks: this.form.value.artworks ?? [], // array d'IRIs
      };

      const request$ =
        this.isEdit && this.editingId
          ? this.api.patch('galleries', this.editingId, payload) // doit être merge-patch+json
          : this.api.create('galleries', payload); // jsonld

      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalError.set(null);
          this.toast.show('Galerie enregistrée avec succès', 'success');
          this.router.navigate(['/admin/galleries']);
        },
        error: (e: any) => {
          console.error('Erreur soumission galerie:', e);
          this.submitting.set(false);
          this.handleApiError(e);
          this.toast.show('Erreur lors de l\'enregistrement de la galerie', 'error');
        },
      });
    };

    // Si aucun nouveau fichier, on envoie directement
    if (!file) {
      proceed(null);
      return;
    }

    // Upload mediaObject puis envoi galerie
    this.api.createFormData(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
      },
    });
  }

  onDelete(): void {
    this.galleryToDeleteId = this.editingId ? Number(this.editingId) : null;
    this.selectedGalleryName = (this.form.value.name ?? '').toString();
    this.confirmModalOpen.set(true);
  }

  handleConfirmDelete(): void {
    if (!this.galleryToDeleteId) return;

    this.submitting.set(true);

    this.api.delete('galleries', this.galleryToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmModalOpen.set(false);
        this.globalError.set(null);
        this.toast.show('Galerie supprimée avec succès', 'success');
        this.router.navigate(['/admin/galleries']);
      },
      error: (e: any) => {
        console.error('Erreur suppression galerie:', e);
        this.submitting.set(false);
        this.confirmModalOpen.set(false);

        // Vérifier si c'est une erreur de contrainte
        const constraintInfo = this.constraintErrorHandler.isConstraintError(e);
        if (constraintInfo.isConstraintError && this.galleryToDeleteId) {
          // Charger les entités liées
          this.constraintErrorHandler.loadGalleryRelatedEntities(this.galleryToDeleteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (relatedData) => {
              if (relatedData.length > 0) {
                this.relatedEntitiesData = relatedData;
                this.relatedEntitiesTitle = 'Impossible de supprimer la galerie';
                this.relatedEntitiesMessage = `Cette galerie ne peut pas être supprimée car elle contient encore des œuvres. Veuillez d'abord retirer les œuvres suivantes :`;
                this.relatedEntitiesModalOpen.set(true);
              } else {
                this.handleApiError(e);
                this.toast.show('Impossible de supprimer la galerie', 'error');
              }
            },
            error: () => {
              this.handleApiError(e);
              this.toast.show('Impossible de supprimer la galerie', 'error');
            }
          });
        } else {
          this.handleApiError(e);
          this.toast.show('Impossible de supprimer la galerie', 'error');
        }
      },
    });
  }

  handleCancelDelete(): void {
    this.confirmModalOpen.set(false);
  }

  closeRelatedEntitiesModal(): void {
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
