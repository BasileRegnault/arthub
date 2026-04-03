import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
})
export class ResetPasswordComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  token = this.route.snapshot.queryParamMap.get('token');
  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    passwordConfirm: ['', [Validators.required]],
  }, { validators: this.passwordsMatch });

  private passwordsMatch(group: any) {
    const p = group.get('password')?.value;
    const c = group.get('passwordConfirm')?.value;
    return p === c ? null : { mismatch: true };
  }

  submit() {
    if (!this.token) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.http.post(`${environment.apiUrl}/reset-password`, {
      token: this.token,
      password: this.form.value.password,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Lien invalide ou expiré.');
      },
    });
  }
}
