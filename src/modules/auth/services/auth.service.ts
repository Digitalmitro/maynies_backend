import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { Request } from "express"

import {
    IRegisterPayload,
    IRegisterResult,

    VerifyOtpInput,
} from '../types';
import { UserModel } from '../../user/models/user.modal';
import { env } from '../../../config/env';
import { UserService } from '../../user/services/user.service';
import { Types } from 'mongoose';
import { OtpModel } from '../models/otp.model';
import { UserDoc } from '../../user/types';
import { IRoleDoc, RoleModel, UserRoleModel } from '../../user/models/userRole.model';
import { RefreshTokenModel } from '../models/refreshToken.model';
import { Response } from 'express';
import { errorMonitor } from 'stream';
import { UserProfileModel } from '../../user/models/userProfile.model';
import { BaseError } from '../../../shared/utils/baseError';


class AuthService {

    private jwtSecret = env.JWT_SECRET || 'your_jwt_secret';
    private jwtExpiresInSeconds = parseInt(env.JWT_EXPIRES_IN || '3600', 10);
    private refreshTokenTTL_SEC = 7 * 24 * 3600; // 7 days
    private userService = new UserService();



    async register(payload: IRegisterPayload, req: Request): Promise<IRegisterResult> {

        const { name, email, password, role } = payload;

        const existingUser = await this.userService.findByEmail(email);
        if (existingUser) {
            throw new BaseError('User with this email already exists.', 409); // 409 Conflict
        }




        const adminRoleDoc = await RoleModel.findOne({ name: 'admin' });
        if (!adminRoleDoc) throw new BaseError('Admin role not found', 500);

        const hasAdmin = await UserRoleModel.exists({ role_id: adminRoleDoc._id });


        let finalRoleName = null;


        if (!hasAdmin) {
            finalRoleName = 'admin';
        } else {
            if (!['student', 'employer'].includes(role)) {
                throw new BaseError('Invalid role. Only student or employer allowed.', 400);
            }
            finalRoleName = role;
        }


        const roleDoc = await RoleModel.findOne({ name: finalRoleName });
        if (!roleDoc) {
            throw new BaseError('Invalid role provided.', 400);
        }




        // 1. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 2. Create user + profile + role
        const user = await this.userService.createUser({
            name,
            email,
            passwordHash,
            roleId: roleDoc._id as Types.ObjectId,
            roleName: roleDoc.name as string
        });


        const otpWindowStart = new Date(Date.now() - 10 * 60 * 1000);
        const recentOtps = await OtpModel.countDocuments({
            user_id: user._id,
            type: 'email_verification',
            created_at: { $gt: otpWindowStart }
        });

        if (recentOtps >= 5) {
            throw new BaseError('Too many OTP requests. Please wait before trying again.', 401);
        }

        // 3. Cleanup any previous unused OTPs
        await OtpModel.deleteMany({
            user_id: user._id,
            type: 'email_verification',
            used_at: null
        });

        // 4. Generate & store new OTP
        const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(plainOtp, 10);

        await OtpModel.create({
            user_id: user._id,
            otp_hash: otpHash,  // renamed from token_hash
            type: 'email_verification',
            expires_at: new Date(Date.now() + 10 * 60 * 1000),
            created_by_ip: req.ip // <- Optional (add if useful)
        });


        return {
            message: 'OTP sent to your email',
            otp: env.NODE_ENV === 'development' ? plainOtp : undefined
        };
    }

    async login(
        email: string,
        password: string,
        ipAddress: string,
        res: Response
    ): Promise<{ msg: string; data: { name: string; email: string; role: string } }> {
        // 1. Find user
        const user = await this.userService.findByEmail(email);
        if (!user) throw new Error('Invalid credentials');

        // 2. Check if active
        if (!user.is_active) throw new Error('Email not verified');

        // 3. Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Invalid credentials');

        await RefreshTokenModel.updateMany(
            { user_id: user._id, revoked_at: null },
            { revoked_at: new Date() }
        );

        // 4. Generate Access Token
        const accessToken = await this.generateAccessToken(user._id)


        // 5. Generate & store Refresh Token
        const { plainToken, newRefreshDoc } = await this.generateRefreshToken(user._id, ipAddress)

        await RefreshTokenModel.updateMany(
            { user_id: user._id, revoked_at: { $ne: null }, replaced_by: null },
            { replaced_by: newRefreshDoc._id }
        );
        // 6. Set cookies exactly like verifyOtp
        const isProd = process.env.NODE_ENV === 'production';
        const cookieDomain = isProd
            // if you ever move to a custom root domain (e.g. maynies.com), use: '.maynies.com'
            ? 'maynies-admin.onrender.com'
            : 'localhost';

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'lax' : 'strict',
            domain: cookieDomain,    // no https://, just the hostname
            path: '/',
            maxAge: this.jwtExpiresInSeconds * 1000,
        });

        res.cookie('refreshToken', plainToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'lax' : 'strict',
            domain: cookieDomain,
            path: '/',
            maxAge: this.refreshTokenTTL_SEC * 1000,
        });

        const profile = await UserProfileModel.findOne({ user_id: user._id }).exec();

        const roleMapping = await UserRoleModel
            .findOne({ user_id: user._id })
            .populate('role_id')
            .exec();

        const roleName = (roleMapping?.role_id as any)?.name || 'user';

        const fullName = [profile?.first_name, profile?.last_name]
            .filter(Boolean)
            .join(' ');

        // 9. Return only message
        return {
            msg: 'User Logged in successfully',
            data: {
                name: fullName || '',
                email: user.email,
                role: roleName,
            }
        };


    }


    async verifyOtp(input: VerifyOtpInput, res: Response, req: Request): Promise<{ msg: string; data: { name: string; email: string; role: string } }> {
        // 1. Validate payload
        const { email, otp } = input;

        // 2. Find user
        const user = await this.userService.findByEmail(email);
        if (!user) throw new BaseError('Invalid email', 400); // 400 Bad Request

        // 3. Fetch latest unused OTP
        const otpDoc = await OtpModel.findOne({
            user_id: user._id as Types.ObjectId,
            type: 'email_verification',
            used_at: null,
        })
            .sort({ created_at: -1 })
            .exec();

        if (!otpDoc) {
            throw new BaseError('OTP not found or expired', 404); // 404 Not Found
        }

        // 4. Compare OTP
        const isMatch = await bcrypt.compare(otp, otpDoc.otp_hash);

        if (!isMatch) {
            throw new BaseError('Invalid OTP', 401); // 401 Unauthorized
        }

        // 5. Mark OTP as used
        otpDoc.used_at = new Date();
        await otpDoc.save();

        // 6. Activate user
        await this.userService.activateUser(user._id as Types.ObjectId);


        const accessToken = await this.generateAccessToken(user._id)
        const { plainToken } = await this.generateRefreshToken(user._id, req.ip || '')


        const isProd = process.env.NODE_ENV === 'production';
        const cookieDomain = isProd
            // if you ever move to a custom root domain (e.g. maynies.com), use: '.maynies.com'
            ? 'maynies-admin.onrender.com'
            : 'localhost';

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'lax' : 'strict',
            domain: cookieDomain,    // no https://, just the hostname
            path: '/',
            maxAge: this.jwtExpiresInSeconds * 1000,
        });

        res.cookie('refreshToken', plainToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'lax' : 'strict',
            domain: cookieDomain,
            path: '/',
            maxAge: this.refreshTokenTTL_SEC * 1000,
        });

        const profile = await UserProfileModel.findOne({ user_id: user._id }).exec();

        const roleMapping = await UserRoleModel
            .findOne({ user_id: user._id })
            .populate('role_id')
            .exec();

        const roleName = (roleMapping?.role_id as any)?.name || 'user';

        const fullName = [profile?.first_name, profile?.last_name]
            .filter(Boolean)
            .join(' ');

        // 9. Return only message
        return {
            msg: 'User registered successfully',
            data: {
                name: fullName || '',
                email: user.email,
                role: roleName,

            }
        };
    }

    generateAccessToken(userId: Types.ObjectId) {
        return jwt.sign(
            { sub: userId.toHexString() },
            this.jwtSecret,
            { expiresIn: '60s' }
        );
    }

    async generateRefreshToken(userId: Types.ObjectId, ipAddress: string) {

        const plainToken = crypto.randomBytes(40).toString('hex');
        const tokenHash = await bcrypt.hash(plainToken, 10);
        const expiresAt = new Date(Date.now() + this.refreshTokenTTL_SEC * 1000);

        const newRefreshDoc = await RefreshTokenModel.create({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt,
            created_by_ip: ipAddress
        });


        return { plainToken, newRefreshDoc };
    }

    async refreshTokens(
        plainToken: string,
        ipAddress: string,
        res: Response
    ): Promise<{ userId: string; refreshed: boolean; newAccessToken?: string }> {
        // 1. Find active refresh tokens within the last 30 days
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        const possibleTokens = await RefreshTokenModel.find({
            revoked_at: null,
            expires_at: { $gt: new Date() },
            created_at: { $gt: since }
        }).lean(); // lean for faster loop

        // 2. Match token using bcrypt
        let matchedToken = null;
        for (const token of possibleTokens) {
            const match = await bcrypt.compare(plainToken, token.token_hash);
            if (match) {
                matchedToken = token;
                break;
            }
        }

        if (!matchedToken) throw new BaseError('Invalid or expired refresh token', 401); // 401 Unauthorized

        // 3. Revoke old token
        await RefreshTokenModel.updateOne(
            { _id: matchedToken._id },
            {
                $set: {
                    revoked_at: new Date(),
                    revoked_by_ip: ipAddress
                }
            }
        );

        // 4. Create new refresh token
        const { plainToken: newPlain } = await this.generateRefreshToken(matchedToken.user_id, ipAddress);


        // 5. Create new access token
        const accessToken = this.generateAccessToken(matchedToken.user_id);

        // 6. Set cookies
        const isProd = process.env.NODE_ENV === 'production';
        const cookieDomain = isProd
            // if you ever move to a custom root domain (e.g. maynies.com), use: '.maynies.com'
            ? 'maynies-admin.onrender.com'
            : 'localhost';

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'lax' : 'strict',
            domain: cookieDomain,    // no https://, just the hostname
            path: '/',
            maxAge: this.jwtExpiresInSeconds * 1000,
        });

        res.cookie('refreshToken', plainToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'lax' : 'strict',
            domain: cookieDomain,
            path: '/',
            maxAge: this.refreshTokenTTL_SEC * 1000,
        });


        return {
            userId: matchedToken.user_id.toString(),
            refreshed: true,
            newAccessToken: accessToken, // optional if needed in frontend log/debug
        };
    }
    /**
     * Revoke a refresh token (on logout).
     */
    async revokeRefreshToken(plainToken: string, ipAddress: string): Promise<void> {
        // 1. Find matching token doc
        const tokenDocs = await RefreshTokenModel.find({ revoked_at: null }).exec();
        let tokenDoc = null;
        for (const doc of tokenDocs) {
            if (await bcrypt.compare(plainToken, doc.token_hash)) {
                tokenDoc = doc;
                break;
            }
        }
        if (!tokenDoc) throw new BaseError('Invalid refresh token', 401); // 401 Unauthorized

        // 2. Mark revoked
        tokenDoc.revoked_at = new Date();
        tokenDoc.revoked_by_ip = ipAddress;
        await tokenDoc.save();
    }


    async sendForgotPasswordOtp(email: string): Promise<{ message: string; otp?: string }> {
        const user = await this.userService.findByEmail(email);
        if (!user) throw new BaseError('No user found with this email', 404); // 404 Not Found

        // 1. Cleanup any old unused password_reset OTPs
        await OtpModel.deleteMany({
            user_id: user._id,
            type: 'password_reset',
            used_at: null
        });

        // 2. Generate new OTP
        const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(plainOtp, 10);

        // 3. Store OTP
        await OtpModel.create({
            user_id: user._id,
            otp_hash: otpHash,
            type: 'password_reset',
            expires_at: new Date(Date.now() + 10 * 60 * 1000),
            created_by_ip: "" // Optional
        });

        // 4. TODO: Send OTP via email or SMS
        // await mailer.sendResetOtp(user.email, plainOtp);

        return {
            message: 'OTP sent to your email',
            ...(process.env.NODE_ENV !== 'production' && { otp: plainOtp })
        };
    }

    async verifyResetOtp(email: string, otp: string): Promise<{ success: boolean }> {
        const user = await this.userService.findByEmail(email);
        if (!user) throw new Error('Invalid request');

        const otpDoc = await OtpModel.findOne({
            user_id: user._id,
            type: 'password_reset',
            used_at: null,
            expires_at: { $gt: new Date() }
        }).sort({ created_at: -1 });

        if (!otpDoc) throw new BaseError('OTP expired or not found', 404); // 404 Not Found

        const isMatch = await bcrypt.compare(otp, otpDoc.otp_hash);
        if (!isMatch) throw new BaseError('Invalid OTP', 401); // 401 Unauthorized

        return { success: true };
    }

    async setNewPassword(email: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.userService.findByEmail(email);
        if (!user) throw new BaseError('User not found', 404); // 404 Not Found

        const otpDoc = await OtpModel.findOne({
            user_id: user._id,
            type: 'password_reset',
            used_at: null,
            expires_at: { $gt: new Date() }
        }).sort({ created_at: -1 });

        if (!otpDoc) throw new BaseError('OTP session expired', 404); // 404 Not Found

        // Mark OTP as used
        otpDoc.used_at = new Date();
        await otpDoc.save();

        // Set new password
        const hashed = await bcrypt.hash(newPassword, 10);
        user.password_hash = hashed;
        await user.save();

        return { message: 'Password updated successfully' };
    }


}

export const authService = new AuthService();
