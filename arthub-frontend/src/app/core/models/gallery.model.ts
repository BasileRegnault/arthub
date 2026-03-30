import { User } from './user.model';
import { Artwork } from './artwork.model';
import { MediaObject } from './mediaObject.model';

export interface Gallery {
  '@id'?: string;
  id?: number;

  name: string;
  description?: string | null;

  coverImage?: MediaObject;
  views?: number | null;

  isPublic: boolean;

  createdBy?: User | string;
  updatedBy?: User | string;

  artworks?: Artwork[] | string[];

  createdAt?: string;
  updatedAt?: string;
}
