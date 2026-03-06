import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Lê o token direto do localStorage (não depende do AuthService)
  let token: string | null = null;
  if (typeof localStorage !== 'undefined') {
    token = localStorage.getItem('token');
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }

  return next(req);
};
