import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationArtistHistoryComponent } from './validation-artist-history.component';

describe('ValidationArtistHistoryComponent', () => {
  let component: ValidationArtistHistoryComponent;
  let fixture: ComponentFixture<ValidationArtistHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationArtistHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationArtistHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
