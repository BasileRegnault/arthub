import { Artwork } from './artwork.model';
import { MediaObject } from './mediaObject.model';
import { User } from './user.model';

export interface Artist {
  '@id'?: string;   // IRI fourni par API Platform
  id: number;

  firstname: string;
  lastname: string;

  bornAt: string;           // date ISO (DateTimeImmutable -> string)
  diedAt?: string | null;

  nationality?: string | null;
  biography?: string | null;

  profilePicture?: MediaObject;
  imageUrl?: string | null;
  isConfirmCreate: boolean;
  toBeConfirmed: boolean;

  artworks?: Artwork[] | string[]; // objets étendus ou IRI[]

  createdBy?: User | string;
  updatedBy?: User | string;

  createdAt?: string;
  updatedAt?: string;
}


export interface SimpleArtist {
  '@id'?: string;
  id?: number;
  firstname?: string;
  lastname?: string;
  nationality?: string | null;
}