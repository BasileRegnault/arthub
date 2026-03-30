import { Gallery } from './gallery.model';
import { MediaObject } from './mediaObject.model';
import { Rating } from './rating.model';

export interface User {
  '@id'?: string;
  id: number;

  username: string;
  email: string;

  roles: string[]; // list<string> en PHP -> string[]

  profilePicture?: MediaObject;

  galleries?: Gallery[] | string[];
  ratings?: Rating[] | string[];
  isSuspended: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export interface SimpleUser {
  '@id'?: string;
  id?: number;
  username?: string;
  email?: string;
}
