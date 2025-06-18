// scripts/seedRoles.ts
import mongoose from 'mongoose';
import { RoleModel } from '../modules/user/models/userRole.model';
import { env } from '../config/env';

export async function seedRoles() {
    const roles = ['admin', 'employer', 'student'];
    for (const name of roles) {
        if (!(await RoleModel.exists({ name }))) {
            await RoleModel.create({ name, description: `${name} role` });
            console.log(`Seeded role: ${name}`);
        }
    }
}