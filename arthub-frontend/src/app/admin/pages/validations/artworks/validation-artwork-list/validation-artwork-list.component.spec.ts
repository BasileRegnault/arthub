import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationArtworkListComponent } from './validation-artwork-list.component';

describe('ValidationArtworkListComponent', () => {
  let component: ValidationArtworkListComponent;
  let fixture: ComponentFixture<ValidationArtworkListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationArtworkListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationArtworkListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
