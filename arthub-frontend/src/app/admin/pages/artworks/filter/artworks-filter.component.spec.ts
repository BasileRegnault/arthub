import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtworksFilterComponent } from './artworks-filter.component';

describe('ArtworksFilterComponent', () => {
  let component: ArtworksFilterComponent;
  let fixture: ComponentFixture<ArtworksFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtworksFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArtworksFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
