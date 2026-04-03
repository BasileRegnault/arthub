import { Component, inject } from '@angular/core';
import { AbstractControlOptions, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BackButtonComponent } from '../../../shared/components/back-button.component/back-button.component';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BackButtonComponent],
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.html'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', Validators.required],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordsMatch } as AbstractControlOptions);

  success = false;
  error?: string;
  loading = false;

  // URL de retour validée : on vérifie qu'elle est bien relative à notre app
  returnUrl = '/';

  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    this.returnUrl = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = undefined;

    const { email, username, password } = this.form.value;

    this.auth.register(email!, username!, password!).subscribe({
      next: () => {
        this.success = true;

        // On connecte l'utilisateur automatiquement après l'inscription
        this.auth.login(email!, password!).subscribe({
          next: () => {
            this.loading = false;
            this.router.navigateByUrl(this.returnUrl);
          },
          error: () => {
            this.loading = false;
            this.error = 'Inscription réussie mais impossible de se connecter automatiquement.';
          }
        });
      },
      error: (err: { error: { error: string; }; }) => {
        this.loading = false;
        this.error = err.error?.error || 'Erreur lors de l\'inscription';
      }
    });
  }

  passwordsMatch(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordsMismatch: true };
  }
}
