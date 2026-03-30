import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationArtistHomeComponent } from './validation-artist-home.component';

describe('ValidationArtistHomeComponent', () => {
  let component: ValidationArtistHomeComponent;
  let fixture: ComponentFixture<ValidationArtistHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationArtistHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationArtistHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
