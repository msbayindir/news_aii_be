import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';

const router: Router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.get('/verify', authenticateToken, authController.verifyToken);

// Admin only routes
router.put('/users/:userId/role', authenticateToken, authorizeRoles('admin'), authController.updateUserRole);

export default router;
