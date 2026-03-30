import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BackButtonComponent } from '../../../shared/components/back-button.component/back-button.component';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BackButtonComponent],
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  error?: string;
  loading = false;

  returnUrl = '/';

  ngOnInit() {
    this.returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = undefined;

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']); // redirection dashboard
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.error = 'Email ou mot de passe incorrect';
        } else {
          this.error = 'Une erreur est survenue, réessayez plus tard';
        }
      }
    });
  }
}
