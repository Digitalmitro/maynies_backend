import { HydratedDocument, Types } from "mongoose";


export type UserDoc = HydratedDocument<IUser>;


export interface IPermission {
    name: string;               // unique, e.g. 'COURSE_CREATE'
    description?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface IRolePermission {
    role_id: Types.ObjectId;
    permission_id: Types.ObjectId;
    assigned_at?: Date;
}

export interface IRole {
    name: string;               // unique, e.g. 'admin'
    description?: string;       // optional
    created_at?: Date;
    updated_at?: Date;
}

export interface IUserRole {
    user_id: Types.ObjectId;
    role_id: Types.ObjectId;
    assigned_at?: Date;
}



export interface IUserProfile {
    user_id: Types.ObjectId;    // reference to User._id
    first_name: string;
    last_name: string;
    avatar_url?: string;
    bio?: string;
    contact_number?: string;
    gender?: string;
    created_at?: Date;
    updated_at?: Date;
}




export interface IUser {
    email: string;
    password_hash: string;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}
