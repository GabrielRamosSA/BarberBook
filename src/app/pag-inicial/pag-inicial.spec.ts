import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagInicial } from './pag-inicial';

describe('PagInicial', () => {
  let component: PagInicial;
  let fixture: ComponentFixture<PagInicial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagInicial]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagInicial);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
