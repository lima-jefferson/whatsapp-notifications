import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.checkAuthenticated();
  
  if (!isAuthenticated) {
    alert('Sessão expirada ou inválida. Faça login novamente.');
    router.navigate(['/login']);
    return false;
  }

  return true;
};