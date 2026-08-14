import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const backendApiBase = 'https://barberbook-awgp.onrender.com/api';
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost =
    isBrowser &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const sameOriginApiBase = isBrowser ? `${window.location.origin}/api` : '';
  const isRelativeApi = req.url.startsWith('/api');
  const isSameOriginApi = Boolean(sameOriginApiBase) && req.url.startsWith(sameOriginApiBase);

  // O proxy de /api existe somente no ng serve local. No Cloudflare Pages,
  // uma URL relativa cai no fallback do Angular e devolve index.html. Em
  // produção, direcionamos esses pedidos ao backend do Render.
  let apiUrl = req.url;
  if (!isLocalhost && isRelativeApi) {
    apiUrl = `${backendApiBase}${req.url.slice('/api'.length)}`;
  } else if (!isLocalhost && isSameOriginApi) {
    apiUrl = `${backendApiBase}${req.url.slice(sameOriginApiBase.length)}`;
  }

  const isBackendApi = isRelativeApi || isSameOriginApi || apiUrl.startsWith(backendApiBase);

  if (isBackendApi) {
    const token = isBrowser ? localStorage.getItem('token') : null;
    let cloned = req.clone({ url: apiUrl, withCredentials: true });

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
