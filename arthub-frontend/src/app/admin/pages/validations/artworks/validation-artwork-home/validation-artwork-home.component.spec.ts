import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationArtworkHomeComponent } from './validation-artwork-home.component';

describe('ValidationArtworkHomeComponent', () => {
  let component: ValidationArtworkHomeComponent;
  let fixture: ComponentFixture<ValidationArtworkHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationArtworkHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationArtworkHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
