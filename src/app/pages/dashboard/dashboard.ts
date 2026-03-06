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

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
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
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
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
}
