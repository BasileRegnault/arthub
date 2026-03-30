import { FormControl } from "@angular/forms";
import { SimpleArtist } from "../artist.model";

export type ArtworkFormControls = {
  title: FormControl<string>;
  type: FormControl<string>;
  style: FormControl<string>;
  creationDate: FormControl<string>;
  description: FormControl<string>;
  image: FormControl<string>;
  location: FormControl<string>;
  artist: FormControl<SimpleArtist | null>;
  isDisplay: FormControl<boolean>;
};