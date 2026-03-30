import { User } from './user.model';

export interface ActivityLog {
  id: number;
  action: string;
  entityClass: string;
  entityId: number;

  userConnected: User;

  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;

  createdAt: string; // ISO date
}
