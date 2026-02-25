import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { PagInicial } from './app/pag-inicial/pag-inicial';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(PagInicial, config, context);

export default bootstrap;
