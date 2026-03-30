import { User } from './user.model';
import { Artwork } from './artwork.model';

export interface Rating {
  '@id'?: string;
  id?: number;

  score: number;
  comment?: string | null;

  createdBy?: User | string;
  updatedBy?: User | string;

  artwork: Artwork | string;

  createdAt?: string;
  updatedAt?: string;
}
