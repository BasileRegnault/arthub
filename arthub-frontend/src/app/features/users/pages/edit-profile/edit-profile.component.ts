import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiPlatformService } from '../../../../core/services/api-platform.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AppFormFieldComponent } from '../../../../shared/components/app-form-field.component/app-form-field.component';
import { BackButtonComponent } from '../../../../shared/components/back-button.component/back-button.component';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppFormFieldComponent,
    BackButtonComponent
  ],
  templateUrl: './edit-profile.component.html',
})
export class EditProfileComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private api = inject(ApiPlatformService<any>);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  currentUser = this.authService.currentUser;
  submitting = signal(false);

  form = this.fb.group({
    username: [this.currentUser?.username || '', [Validators.required, Validators.maxLength(100)]],
    email: [(this.currentUser as any)?.email || '', [Validators.required, Validators.email]],
  });

  ngOnInit() {
    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    const userId = (this.currentUser as any)?.id;
    if (!userId) return;

    this.submitting.set(true);

    const payload = {
      username: this.form.value.username,
      email: this.form.value.email,
    };

    this.api.patch('users', userId.toString(), payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.show('Profil mis à jour avec succès', 'success');
        this.router.navigate(['/profile']);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.show('Erreur lors de la mise à jour du profil', 'error');
      }
    });
  }

  cancel() {
    this.router.navigate(['/profile']);
  }
}
