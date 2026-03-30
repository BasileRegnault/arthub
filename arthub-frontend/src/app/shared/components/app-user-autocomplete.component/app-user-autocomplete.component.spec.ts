import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppUserAutocompleteComponent } from './app-user-autocomplete.component';

describe('AppUserAutocompleteComponent', () => {
  let component: AppUserAutocompleteComponent;
  let fixture: ComponentFixture<AppUserAutocompleteComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppUserAutocompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppUserAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
