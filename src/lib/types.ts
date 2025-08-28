
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  USER: 'usuario',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Should be hashed in a real app
  role: Role;
}
