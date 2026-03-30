import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BackButtonComponent } from '../../../shared/components/back-button.component/back-button.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [BackButtonComponent, CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

    form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    success = false;
    loading = false;
    error?: string;

    submit() {
      if (this.form.invalid) return;

      this.loading = true;
      this.error = undefined;

      this.http.post(`${environment.apiUrl}/forgot-password`, this.form.value)
        .subscribe({
          next: () => {
            this.loading = false;
            this.success = true;
          },
          error: () => {
            this.loading = false;
            this.error = 'Une erreur est survenue, veuillez réessayer.';
          }
        });
    }
}
