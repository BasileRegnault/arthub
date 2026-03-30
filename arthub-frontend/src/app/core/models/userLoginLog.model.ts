import { User } from "./user.model";

export interface UserLoginLog {
  id: number;
  userConnected?: User | string;
  ipHash?: string;
  event?: string;
  userAgent?: string;
  message?: string;
  createdAt?: string;
}