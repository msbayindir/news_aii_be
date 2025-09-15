import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logService } from '../services/log.service';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, role = 'viewer' } = req.body;

      // Validate input
      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
        return;
      }

      if (username.length < 3) {
        res.status(400).json({
          success: false,
          error: 'Username must be at least 3 characters long',
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long',
        });
        return;
      }

      // Validate role
      const validRoles = ['admin', 'editor', 'viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role. Must be one of: admin, editor, viewer',
        });
        return;
      }

      const user = await authService.createUser({
        username: username.trim().toLowerCase(),
        password,
        role,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error: any) {
      await logService.error('Registration failed', { error });
      
      if (error.message === 'User already exists') {
        res.status(409).json({
          success: false,
          error: 'Username already exists',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      // Validate input
      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
        return;
      }

      const result = await authService.login({
        username: username.trim().toLowerCase(),
        password,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: any) {
      await logService.error('Login failed', { error });
      
      if (error.message === 'Invalid credentials') {
        res.status(401).json({
          success: false,
          error: 'Kullanıcı adı veya şifre yanlış',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to login',
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const profile = await authService.getUserProfile(req.user.userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      await logService.error('Failed to get user profile', { error });
      
      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
      });
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { userId } = req.params;
      const { role } = req.body;

      // Validate role
      const validRoles = ['admin', 'editor', 'viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role. Must be one of: admin, editor, viewer',
        });
        return;
      }

      const updatedUser = await authService.updateUserRole(
        userId,
        role,
        req.user.userId
      );

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: updatedUser,
      });
    } catch (error: any) {
      await logService.error('Failed to update user role', { error });
      
      if (error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
      });
    }
  }

  /**
   * Verify token endpoint
   */
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          valid: true,
          user: req.user,
        },
      });
    } catch (error) {
      await logService.error('Token verification failed', { error });
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  }
}

export const authController = new AuthController();
