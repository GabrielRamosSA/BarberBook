import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Só envia cookies em requisições ao backend (/api). Não alterar requests externas (ex: IBGE).
  const isBackendApi = req.url.startsWith('/api') || req.url.startsWith(window.location.origin + '/api');
  if (isBackendApi) {
    const cloned = req.clone({ withCredentials: true });
    return next(cloned);
  }

  return next(req);
};
