import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pag-inicial/pag-inicial').then((m) => m.PaginaInicial),
  },
  {
    path: 'barbearias',
    loadComponent: () =>
      import('./pages/barbearias-busca/barbearias-busca').then(
        (m) => m.BarbeariasBuscaComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/registro/registro').then((m) => m.RegistroComponent),
  },
  {
    path: 'verificar-email',
    loadComponent: () =>
      import('./pages/verificar-email/verificar-email').then(
        (m) => m.VerificarEmailComponent,
      ),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'dev-secret-admin-portal',
    loadComponent: () =>
      import('./pages/admin-dev/admin-dev').then((m) => m.AdminDevComponent),
  },
  {
    path: 'esqueceu-senha',
    loadComponent: () =>
      import('./pages/esqueceu-senha/esqueceu-senha').then(
        (m) => m.EsqueceuSenhaComponent,
      ),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./pages/redefinir-senha/redefinir-senha').then(
        (m) => m.RedefinirSenhaComponent,
      ),
  },
  {
    path: 'barbearia/:slug',
    loadComponent: () =>
      import('./pages/agendar/agendar').then((m) => m.AgendarComponent),
  },
  {
    path: 'meus-agendamentos',
    loadComponent: () =>
      import('./pages/meus-agendamentos/meus-agendamentos').then(
        (m) => m.MeusAgendamentosComponent,
      ),
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./pages/perfil/perfil').then((m) => m.PerfilComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/overview/overview').then(
            (m) => m.DashboardOverviewComponent,
          ),
      },
      {
        path: 'barbearias',
        loadComponent: () =>
          import('./pages/dashboard/barbearias-list/barbearias-list').then(
            (m) => m.BarbeariasListComponent,
          ),
      },
      {
        path: 'barbearias/nova',
        loadComponent: () =>
          import('./pages/dashboard/barbearia-form/barbearia-form').then(
            (m) => m.BarbeariaFormComponent,
          ),
      },
      {
        path: 'barbearias/:id',
        loadComponent: () =>
          import('./pages/dashboard/barbearia-form/barbearia-form').then(
            (m) => m.BarbeariaFormComponent,
          ),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./pages/dashboard/agenda/agenda').then(
            (m) => m.AgendaComponent,
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./pages/dashboard/clientes/clientes').then(
            (m) => m.ClientesComponent,
          ),
      },
      {
        path: 'planos',
        loadComponent: () =>
          import('./pages/dashboard/planos/planos').then(
            (m) => m.PlanosComponent,
          ),
      },
      {
        path: 'planos/pagamento',
        loadComponent: () =>
          import('./pages/dashboard/pagamento/pagamento').then(
            (m) => m.PagamentoComponent,
          ),
      },
      {
        path: 'planos/retorno',
        loadComponent: () =>
          import('./pages/dashboard/pagamento/retorno/retorno').then(
            (m) => m.RetornoPagamentoComponent,
          ),
      },
      {
        path: 'suporte',
        loadComponent: () =>
          import('./pages/dashboard/suporte/suporte').then(
            (m) => m.SuporteComponent,
          ),
      },
    ],
  },
];
