import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class AppComponent implements OnInit {
  modoEscuroAtivo = false;
  private readonly chaveTemaStorage = 'bb_theme';

  ngOnInit() {
    if (typeof window === 'undefined') return;

    const temaSalvo = localStorage.getItem(this.chaveTemaStorage);
    if (temaSalvo === 'dark' || temaSalvo === 'light') {
      this.modoEscuroAtivo = temaSalvo === 'dark';
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      this.modoEscuroAtivo = true;
    }

    this.aplicarTema(this.modoEscuroAtivo);
  }

  alternarTema() {
    this.modoEscuroAtivo = !this.modoEscuroAtivo;
    this.aplicarTema(this.modoEscuroAtivo);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.chaveTemaStorage, this.modoEscuroAtivo ? 'dark' : 'light');
    }
  }

  private aplicarTema(ativar: boolean) {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('theme-dark', ativar);
  }
}
