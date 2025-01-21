import { TestBed } from '@angular/core/testing';

import { XdripService } from './xdrip.service';

describe('XdripService', () => {
  let service: XdripService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(XdripService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
