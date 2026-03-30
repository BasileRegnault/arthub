export interface HydraCollection<T> {
  "hydra:member": T[];
  "hydra:totalItems": number;
  "hydra:view"?: {
    "@id": string;
    "hydra:first"?: string;
    "hydra:last"?: string;
    "hydra:next"?: string;
    "hydra:previous"?: string;
  };
}