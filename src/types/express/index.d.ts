// src/types/express/index.d.ts

import { UserDoc, IUserProfile, IUserRole } from "../../modules/user/types";


interface AuthPayload {
    user: IUserDocument;
    profile: IUserProfileDoc | null;
    roles: IUserRoleDoc[];
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}
