import prisma from '../config/database.config';
import { categoryService } from '../services/category.service';

async function resetDatabase() {
  try {
    console.log('🗑️  Clearing database...');
    
    // Delete all articles first (due to foreign key constraints)
    await prisma.article.deleteMany({});
    console.log('✅ Articles deleted');
    
    // Delete all categories
    await prisma.category.deleteMany({});
    console.log('✅ Categories deleted');
    
    // Delete all summaries
    await prisma.summary.deleteMany({});
    console.log('✅ Summaries deleted');
    
    // Reset feed sources last check
    await prisma.feedSource.updateMany({
      data: {
        lastCheck: null
      }
    });
    console.log('✅ Feed sources reset');
    
    // Initialize standard categories
    await categoryService.initializeStandardCategories();
    console.log('✅ Standard categories initialized');
    
    console.log('🎉 Database reset complete!');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase();
