// src/controllers/UserController.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
    async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const users = await userService.getAllUsers();
            res.json({ users });
            // no `return res.json(...)` here
        } catch (err) {
            next(err);
        }
    }
}


export const userController = new UserController();
