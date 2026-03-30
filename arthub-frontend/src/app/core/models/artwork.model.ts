import { Artist } from './artist.model';
import { Gallery } from './gallery.model';
import { Rating } from './rating.model';
import { ArtworkType } from './enum/artwork-type.enum';
import { ArtworkStyle } from './enum/artwork-style.enum';
import { MediaObject } from './mediaObject.model';
import { User } from './user.model';

export interface Artwork {
  '@id'?: string;
  id: number;

  title: string;

  type: ArtworkType;
  style: ArtworkStyle;

  creationDate: string; // date ISO

  description: string;

  image?: MediaObject;
  imageUrl?: string | null;
  location?: string | null;

  artist: Artist; // IRI ou Artist étendu
  views?: number | null;

  isDisplay: boolean;
  isConfirmCreate: boolean;
  toBeConfirmed: boolean;

  galleries?: Gallery[] | string[];
  ratings?: Rating[] | string[];

  createdBy?: User | string;
  updatedBy?: User | string;

  createdAt?: string;
  updatedAt?: string;
}
