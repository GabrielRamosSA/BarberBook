import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const backendApiBase = 'https://barberbook-awgp.onrender.com/api';
  const isBrowser = typeof window !== 'undefined';
  const isBackendApi =
    req.url.startsWith('/api') ||
    (isBrowser && req.url.startsWith(window.location.origin + '/api')) ||
    req.url.startsWith(backendApiBase);

  if (isBackendApi) {
    const token = isBrowser ? localStorage.getItem('token') : null;
    let cloned = req.clone({ withCredentials: true });

    if (token && !req.headers.has('Authorization')) {
      cloned = cloned.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next(cloned);
  }

  return next(req);
};
