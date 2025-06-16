import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

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


class AuthService {

    private jwtSecret = env.JWT_SECRET || 'your_jwt_secret';
    private jwtExpiresInSeconds = parseInt(env.JWT_EXPIRES_IN || '3600', 10);
    private refreshTokenTTL_SEC = 7 * 24 * 3600; // 7 days
    private userService = new UserService();



    async register(payload: IRegisterPayload): Promise<IRegisterResult> {

        const { name, email, password, role } = payload;
        const roleDoc = await RoleModel.findOne({ name: role });

        if (await this.userService.findByEmail(email)) {
            throw new Error('User with this email already exists');
        }

        if (!roleDoc) throw new Error('Invalid role');

        // 1. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 2. Create user + profile + role
        const user = await this.userService.createUser({
            name,
            email,
            passwordHash,
            roleId: roleDoc._id as Types.ObjectId,
        });




        // 3. Cleanup any previous unused OTPs
        await OtpModel.deleteMany({ user_id: user._id, type: 'email_verification', used_at: null });

        // 4. Generate & store new OTP
        const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(plainOtp, 10);
        await OtpModel.create({
            user_id: user._id,
            token_hash: otpHash,
            type: 'email_verification',
            expires_at: new Date(Date.now() + 10 * 60 * 1000)
        });


        // 5. Send OTP via email/SMS (future implementation)
        // 👉 mailer.sendVerificationOtp(email, plainOtp)
        //    .then(() => console.log('Verification email sent'))
        //    .catch(err => console.error('Email send error:', err));

        return {
            message: 'OTP sent to your email',
            otp: plainOtp
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

        // 4. Generate Access Token
        const accessToken = await this.generateAccessToken(user._id)


        // 5. Generate & store Refresh Token
        const plainRefreshToken = await this.generateRefreshToken(user._id, ipAddress)
        // 6. Set cookies exactly like verifyOtp
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: this.jwtExpiresInSeconds * 1000,
        });
        res.cookie('refreshToken', plainRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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


    async verifyOtp(input: VerifyOtpInput, res: Response): Promise<{ msg: string; data: { name: string; email: string; role: string } }> {
        // 1. Validate payload
        const { email, otp } = input;

        // 2. Find user
        const user = await this.userService.findByEmail(email);
        if (!user) throw new Error('Invalid email');

        // 3. Fetch latest unused OTP
        const otpDoc = await OtpModel.findOne({
            user_id: user._id as Types.ObjectId,
            type: 'email_verification',
            used_at: null,
        })
            .sort({ created_at: -1 })
            .exec();

        if (!otpDoc) {
            throw new Error('OTP not found or expired');
        }

        // 4. Compare OTP
        const isMatch = await bcrypt.compare(otp, otpDoc.token_hash);

        if (!isMatch) {
            throw new Error('Invalid OTP');
        }

        // 5. Mark OTP as used
        otpDoc.used_at = new Date();
        await otpDoc.save();

        // 6. Activate user
        await this.userService.activateUser(user._id as Types.ObjectId);


        const accessToken = await this.generateAccessToken(user._id)
        const plainRefreshToken = await this.generateRefreshToken(user._id, "1122343")
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: this.jwtExpiresInSeconds * 1000,
        });
        // Refresh Token (long-lived)
        res.cookie('refreshToken', plainRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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
            { expiresIn: this.jwtExpiresInSeconds }
        );
    }

    async generateRefreshToken(userId: Types.ObjectId, ipAddress: string) {
        const plainToken = crypto.randomBytes(40).toString('hex');
        const tokenHash = await bcrypt.hash(plainToken, 10);
        const expiresAt = new Date(Date.now() + this.refreshTokenTTL_SEC * 1000);

        await RefreshTokenModel.create({

            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt,
            created_by_ip: ipAddress
        });

        return plainToken;
    }

    async refreshTokens(
        plainToken: string,
        ipAddress: string,
        res: Response
    ): Promise<void> {
        // 1. Find and verify existing refresh token doc
        const tokenDocs = await RefreshTokenModel.find({ revoked_at: null }).exec();
        let currentDoc = null;
        for (const doc of tokenDocs) {
            if (await bcrypt.compare(plainToken, doc.token_hash)) {
                currentDoc = doc;
                break;
            }
        }
        if (!currentDoc) throw new Error('Invalid refresh token');
        if (currentDoc.expires_at < new Date()) {
            throw new Error('Refresh token expired');
        }

        // 2. Revoke old
        currentDoc.revoked_at = new Date();
        currentDoc.revoked_by_ip = ipAddress;
        await currentDoc.save();

        // 3. Issue new Refresh Token
        const newPlain = crypto.randomBytes(40).toString('hex');
        const newHash = await bcrypt.hash(newPlain, 10);
        const newExpires = new Date(Date.now() + this.refreshTokenTTL_SEC * 1000);
        await RefreshTokenModel.create({
            user_id: currentDoc.user_id,
            token_hash: newHash,
            expires_at: newExpires,
            created_by_ip: ipAddress,
            replaced_by: currentDoc._id,
        });

        // 4. Issue new Access Token
        const accessToken = jwt.sign(
            { sub: currentDoc.user_id.toHexString() },
            this.jwtSecret,
            { expiresIn: this.jwtExpiresInSeconds } as SignOptions
        );

        // 5. Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: this.jwtExpiresInSeconds * 1000,
        });
        res.cookie('refreshToken', newPlain, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: this.refreshTokenTTL_SEC * 1000,
        });
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
        if (!tokenDoc) throw new Error('Invalid refresh token');

        // 2. Mark revoked
        tokenDoc.revoked_at = new Date();
        tokenDoc.revoked_by_ip = ipAddress;
        await tokenDoc.save();
    }

    // async refreshTokens(
    //     plainToken: string,
    //     ipAddress: string,
    //     res: Response
    // ): Promise<void> {
    //     // 1. Find matching hashed token in DB
    //     const tokenDocs = await RefreshTokenModel.find({ revoked_at: null }).exec();
    //     // better: add index on token_hash, but need to compare all hashes...

    //     let tokenDoc;
    //     for (const doc of tokenDocs) {
    //         if (await bcrypt.compare(plainToken, doc.token_hash)) {
    //             tokenDoc = doc; break;
    //         }
    //     }
    //     if (!tokenDoc) throw new BadRequestError('Invalid refresh token');

    //     // 2. Check expiry
    //     if (tokenDoc.expires_at < new Date()) throw new BadRequestError('Token expired');

    //     // 3. Revoke old
    //     tokenDoc.revoked_at = new Date();
    //     tokenDoc.revoked_by_ip = ipAddress;

    //     // 4. Generate new refresh token
    //     const newPlain = crypto.randomBytes(40).toString('hex');
    //     const newHash = await bcrypt.hash(newPlain, 10);
    //     const newExpires = new Date(Date.now() + this.refreshTokenTTL_SEC * 1000);
    //     const newDoc = await RefreshTokenModel.create({
    //         user_id: tokenDoc.user_id,
    //         token_hash: newHash,
    //         expires_at: newExpires,
    //         created_by_ip: ipAddress,
    //         replaced_by: tokenDoc._id,
    //     });

    //     await tokenDoc.save();

    //     // 5. Generate access token
    //     const accessToken = jwt.sign(
    //         { sub: tokenDoc.user_id.toHexString() },
    //         this.jwtSecret,
    //         { expiresIn: this.jwtExpiresInSeconds }
    //     );

    //     // 6. Set cookies
    //     res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'strict', maxAge: this.jwtExpiresInSeconds * 1000 });
    //     res.cookie('refreshToken', newPlain, { httpOnly: true, sameSite: 'strict', maxAge: this.refreshTokenTTL_SEC * 1000 });
    // }
    // async logout(req: Request, res: Response, next: NextFunction) {
    //     try {
    //         const token = req.cookies.refreshToken;
    //         if (token) await authService.revokeToken(token, req.ip);
    //         res.clearCookie('accessToken');
    //         res.clearCookie('refreshToken');
    //         res.json({ message: 'Logged out' });
    //     } catch (err) {
    //         next(err);
    //     }
    // }
}

export const authService = new AuthService();
