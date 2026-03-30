import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppArtistAutocompleteComponent } from './app-artist-autocomplete.component';

describe('AppArtistAutocompleteComponent', () => {
  let component: AppArtistAutocompleteComponent;
  let fixture: ComponentFixture<AppArtistAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppArtistAutocompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppArtistAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
