import prisma from '../config/database.config';
import { STANDARD_CATEGORIES, CATEGORY_MAPPINGS, CATEGORY_NORMALIZATION_PROMPT, StandardCategory } from '../config/categories.config';
import { geminiService } from './gemini.service';
import { logService } from './log.service';

class CategoryService {
  /**
   * Normalize category name using rules and AI
   */
  async normalizeCategory(categoryName: string): Promise<StandardCategory> {
    if (!categoryName) return 'Diğer';
    
    const normalized = categoryName.toLowerCase().trim();
    
    // First check direct mappings
    if (CATEGORY_MAPPINGS[normalized]) {
      return CATEGORY_MAPPINGS[normalized];
    }
    
    // Check partial matches
    for (const [key, value] of Object.entries(CATEGORY_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // If no match found, use AI
    try {
      const prompt = `${CATEGORY_NORMALIZATION_PROMPT}\n\nKategori: "${categoryName}"\n\nBu kategoriyi uygun standart kategori ile eşleştir ve sadece kategori adını döndür.`;
      
      const response = await geminiService.generateContent(prompt);
      const aiCategory = response.trim();
      
      // Validate AI response
      if (STANDARD_CATEGORIES.includes(aiCategory as StandardCategory)) {
        // Cache this mapping for future use
        CATEGORY_MAPPINGS[normalized] = aiCategory as StandardCategory;
        logService.info(`AI mapped category: ${categoryName} -> ${aiCategory}`);
        return aiCategory as StandardCategory;
      }
    } catch (error) {
      logService.error('AI category normalization failed:', error);
    }
    
    // Default fallback
    return 'Diğer';
  }
  
  /**
   * Get or create normalized category
   */
  async getOrCreateCategory(categoryName: string) {
    const normalizedName = await this.normalizeCategory(categoryName);
    
    // Check if normalized category exists
    let category = await prisma.category.findFirst({
      where: { 
        name: normalizedName
      }
    });
    
    // Create if not exists
    if (!category) {
      category = await prisma.category.create({
        data: { name: normalizedName }
      });
      logService.info(`Created new category: ${normalizedName}`);
    }
    
    return category;
  }
  
  /**
   * Batch normalize categories
   */
  async normalizeBatch(categories: string[]): Promise<Map<string, StandardCategory>> {
    const result = new Map<string, StandardCategory>();
    
    // Process categories that need AI normalization
    const needsAI: string[] = [];
    
    for (const category of categories) {
      const normalized = category.toLowerCase().trim();
      
      // Check direct mappings first
      if (CATEGORY_MAPPINGS[normalized]) {
        result.set(category, CATEGORY_MAPPINGS[normalized]);
      } else {
        needsAI.push(category);
      }
    }
    
    // Process remaining with AI if needed
    if (needsAI.length > 0) {
      try {
        const prompt = `${CATEGORY_NORMALIZATION_PROMPT}\n\nKategoriler: ${JSON.stringify(needsAI)}\n\nJSON formatında yanıt ver.`;
        
        const response = await geminiService.generateContent(prompt);
        const aiMappings = JSON.parse(response);
        
        for (const [original, normalized] of Object.entries(aiMappings)) {
          if (STANDARD_CATEGORIES.includes(normalized as StandardCategory)) {
            result.set(original, normalized as StandardCategory);
            // Cache for future use
            CATEGORY_MAPPINGS[original.toLowerCase().trim()] = normalized as StandardCategory;
          } else {
            result.set(original, 'Diğer');
          }
        }
      } catch (error) {
        logService.error('Batch AI normalization failed:', error);
        // Fallback to individual processing
        for (const category of needsAI) {
          result.set(category, await this.normalizeCategory(category));
        }
      }
    }
    
    return result;
  }
  
  /**
   * Clean up duplicate categories in database
   */
  async cleanupDuplicates() {
    logService.info('Starting category cleanup...');
    
    // Get all categories with article count
    const allCategories = await prisma.category.findMany({
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
    
    // Group by normalized name
    const grouped = new Map<string, typeof allCategories>();
    
    for (const category of allCategories) {
      const normalizedKey = category.name.toLowerCase().trim();
      if (!grouped.has(normalizedKey)) {
        grouped.set(normalizedKey, []);
      }
      grouped.get(normalizedKey)!.push(category);
    }
    
    // Process duplicates
    for (const [, categories] of grouped.entries()) {
      if (categories.length > 1) {
        // Sort by article count (keep the one with most articles)
        categories.sort((a: any, b: any) => b._count.articles - a._count.articles);
        
        const keepCategory = categories[0];
        const duplicates = categories.slice(1);
        
        logService.info(`Merging ${duplicates.length} duplicates of "${keepCategory.name}"`);
        
        for (const duplicate of duplicates) {
          // Get articles with this category
          const articlesWithCategory = await prisma.article.findMany({
            where: {
              categories: {
                some: { id: duplicate.id }
              }
            },
            select: { id: true }
          });
          
          // Update each article individually
          for (const article of articlesWithCategory) {
            await prisma.article.update({
              where: { id: article.id },
              data: {
                categories: {
                  disconnect: { id: duplicate.id },
                  connect: { id: keepCategory.id }
                }
              }
            });
          }
          
          // Delete duplicate category
          await prisma.category.delete({
            where: { id: duplicate.id }
          });
        }
      }
    }
    
    logService.info('Category cleanup completed');
  }
  
  /**
   * Initialize standard categories
   */
  async initializeStandardCategories() {
    logService.info('Initializing standard categories...');
    
    for (const categoryName of STANDARD_CATEGORIES) {
      await prisma.category.upsert({
        where: { 
          name: categoryName 
        },
        create: { 
          name: categoryName 
        },
        update: {}
      });
    }
    
    logService.info(`Initialized ${STANDARD_CATEGORIES.length} standard categories`);
  }
}

export const categoryService = new CategoryService();
