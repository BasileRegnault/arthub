import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtworkCardComponent } from './artwork-card.component';

describe('ArtworkCard', () => {
  let component: ArtworkCardComponent;
  let fixture: ComponentFixture<ArtworkCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtworkCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArtworkCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
