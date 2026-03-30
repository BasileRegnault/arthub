import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationArtworkHistoryComponent } from './validation-artwork-history.component';

describe('ValidationArtworkHistoryComponent', () => {
  let component: ValidationArtworkHistoryComponent;
  let fixture: ComponentFixture<ValidationArtworkHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationArtworkHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationArtworkHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
