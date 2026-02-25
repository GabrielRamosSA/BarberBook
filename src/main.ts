import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { PagInicial } from './app/pag-inicial/pag-inicial';

bootstrapApplication(PagInicial, appConfig)
  .catch((err) => console.error(err));
