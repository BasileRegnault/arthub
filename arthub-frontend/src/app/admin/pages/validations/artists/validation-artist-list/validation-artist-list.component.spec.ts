import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationArtistListComponent } from './validation-artist-list.component';

describe('ValidationArtistListComponent', () => {
  let component: ValidationArtistListComponent;
  let fixture: ComponentFixture<ValidationArtistListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationArtistListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationArtistListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
