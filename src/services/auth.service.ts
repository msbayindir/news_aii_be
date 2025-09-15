import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.config';
import { config } from '../config/env.config';
import { logService } from './log.service';

export interface CreateUserData {
  username: string;
  password: string;
  role: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as any);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          password: hashedPassword,
          role: userData.role,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await logService.info('User created successfully', { username: userData.username, role: userData.role });
      return user;
    } catch (error) {
      await logService.error('Failed to create user', { error, username: userData.username });
      throw error;
    }
  }

  /**
   * Authenticate user and return token
   */
  async login(loginData: LoginData) {
    try {
      // Find user by username
      const user = await prisma.user.findUnique({
        where: { username: loginData.username },
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await this.comparePassword(loginData.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const tokenPayload: JwtPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
      };

      const token = this.generateToken(tokenPayload);

      await logService.info('User logged in successfully', { username: user.username });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      };
    } catch (error) {
      await logService.error('Failed to login user', { error, username: loginData.username });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      await logService.error('Failed to get user by ID', { error, userId });
      throw error;
    }
  }

  /**
   * Get user profile with role-based data
   */
  async getUserProfile(userId: string) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Return different data based on role
      const baseProfile = {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      };

  

      return {
        ...baseProfile
      };
    } catch (error) {
      await logService.error('Failed to get user profile', { error, userId });
      throw error;
    }
  }

  /**
   * Get role-based permissions
   */
 

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: string, adminUserId: string) {
    try {
      // Check if admin user exists and has admin role
      const adminUser = await this.getUserById(adminUserId);
      if (!adminUser || adminUser.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: {
          id: true,
          username: true,
          role: true,
          updatedAt: true,
        },
      });

      await logService.info('User role updated', { 
        targetUserId: userId, 
        newRole, 
        adminUserId 
      });

      return updatedUser;
    } catch (error) {
      await logService.error('Failed to update user role', { error, userId, newRole, adminUserId });
      throw error;
    }
  }
}

export const authService = new AuthService();
