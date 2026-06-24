import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, User } from '../../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  sidebarCollapsed = false;
  activeRoute = '';
  isMobileView = false;
  mobileMenuOpen = false;

  private readonly MOBILE_BREAKPOINT = 960;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.atualizarViewport();

    this.authService.user$.subscribe((user) => {
      this.user = user;
      if (user && user.tipo !== 'BARBEIRO') {
        this.router.navigate(['/perfil']);
      }
    });

    if (this.authService.isLoggedIn() && !this.user) {
      this.authService.loadUser();
    }

    // Detecta rota ativa
    this.activeRoute = this.router.url;
    this.router.events.subscribe(() => {
      this.activeRoute = this.router.url;
      if (this.isMobileView) {
        this.mobileMenuOpen = false;
      }
    });
  }

  toggleSidebar() {
    if (this.isMobileView) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      return;
    }

    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.atualizarViewport();
  }

  getAvatarUrl(): string {
    if (this.user?.avatar) {
      if (this.user.avatar.startsWith('http')) return this.user.avatar;
      return `${this.user.avatar}`;
    }
    return '';
  }

  logout() {
    this.authService.logout();
  }

  isActive(path: string): boolean {
    return this.activeRoute.includes(path);
  }

  getCurrentPageTitle(): string {
    if (this.activeRoute.includes('/dashboard/barbearias')) return 'Barbearias';
    if (this.activeRoute.includes('/dashboard/agenda')) return 'Agenda';
    if (this.activeRoute.includes('/dashboard/clientes')) return 'Clientes';
    if (this.activeRoute.includes('/dashboard/planos')) return 'Planos';
    if (this.activeRoute.includes('/dashboard/suporte')) return 'Suporte';
    return 'Painel';
  }

  private atualizarViewport() {
    if (typeof window === 'undefined') return;

    const isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
    this.isMobileView = isMobile;

    if (isMobile) {
      this.sidebarCollapsed = false;
    } else {
      this.mobileMenuOpen = false;
    }
  }
}
