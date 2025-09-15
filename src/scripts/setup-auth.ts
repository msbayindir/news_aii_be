import prisma from '../config/database.config';
import { authService } from '../services/auth.service';
import { logService } from '../services/log.service';

async function setupAuth() {
  try {
    console.log('🔧 Setting up authentication system...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.username);
      return;
    }

    // Create default admin user
    const adminUser = await authService.createUser({
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    });

    console.log('✅ Admin user created successfully:', adminUser.username);
    console.log('📝 Default credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('⚠️  Please change the default password after first login!');

    // Create a sample editor user
    const editorUser = await authService.createUser({
      username: 'editor',
      password: 'editor123',
      role: 'editor'
    });

    console.log('✅ Editor user created successfully:', editorUser.username);

    // Create a sample viewer user
    const viewerUser = await authService.createUser({
      username: 'viewer',
      password: 'viewer123',
      role: 'viewer'
    });

    console.log('✅ Viewer user created successfully:', viewerUser.username);

    await logService.info('Authentication system setup completed');
    console.log('🎉 Authentication system setup completed!');

  } catch (error) {
    console.error('❌ Failed to setup authentication system:', error);
    await logService.error('Failed to setup authentication system', { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupAuth();
}

export { setupAuth };
