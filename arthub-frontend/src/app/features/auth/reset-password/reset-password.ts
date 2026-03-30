import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BackButtonComponent } from '../../../shared/components/back-button.component/back-button.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPasswordComponent {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  token = this.route.snapshot.queryParamMap.get('token');
  loading = false;
  error?: string;

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit() {
    if (!this.token || this.form.invalid) return;

    this.loading = true;

    this.http.post(`${environment.apiUrl}/reset-password`, {
      token: this.token,
      password: this.form.value.password
    }).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: err => {
        this.loading = false;
        this.error = err.error?.message || 'Lien invalide';
      }
    });
  }
}
