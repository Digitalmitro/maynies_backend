import { Types } from "mongoose";

export interface IOtp {
    user_id: Types.ObjectId;            // Reference to User _id
    token_hash: string;                 // Hashed OTP
    type: 'email_verification' | 'password_reset';
    expires_at: Date;
    used_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
}


export interface IRegisterPayload {
    name: string
    email: string;
    password: string;
    role: string
}
export interface IRegisterResult { message: string, otp: string }

export interface ILoginPayload {
    email: string;
    password: string;
}
export interface ILoginResult {
    user: { id: string; name: string; email: string };
    token: string;
}

export interface IForgotPasswordPayload {
    email: string;
}
export interface IForgotPasswordResult {
    message: string;
}

export interface IResetPasswordPayload {
    token: string;
    newPassword: string;
}
export interface IResetPasswordResult {
    message: string;
}

export interface IJwtPayload {
    userId: string;
    email: string;
    // iat: number;
    // exp: number;
}



export interface IRefreshToken {
    user_id: Types.ObjectId;        // refer User._id
    token_hash: string;                // bcrypt-hashed random string
    expires_at: Date;                  // kab expire hoga
    created_at?: Date;
    revoked_at?: Date | null;          // kab revoke hua
    replaced_by?: Types.ObjectId | null; // agar rotate hua toh naya token ka _id
    created_by_ip?: string;
    revoked_by_ip?: string | null;
}

export interface VerifyOtpInput {
    email: string;                // bcrypt-hashed random string
    otp: string;                  // kab expire hoga

}


