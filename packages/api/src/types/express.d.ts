import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: Role;
      clinicId?: string;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
