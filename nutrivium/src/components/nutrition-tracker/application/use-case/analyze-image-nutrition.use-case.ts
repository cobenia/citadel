import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/shared/domain/logger/logger';
import { NotionRepository, NotionImageData } from '../../domain/repository/notion.repository';
import { NutritionAnalyzerService } from '../../domain/service/nutrition-analyzer.service';
import { NutritionAnalysisRepository } from '../../domain/repository/nutrition-analysis.repository';
import { NutritionAnalysis } from '../../domain/entity/nutrition-analysis.entity';
import { AnalyzeNutritionRequestDto, AnalyzeNutritionResponseDto } from '../dto/analyze-nutrition.dto';

@injectable()
export class AnalyzeImageNutritionUseCase {
  constructor(
    @inject('NotionRepository') private notionRepository: NotionRepository,
    @inject('NutritionAnalyzerService') private nutritionAnalyzer: NutritionAnalyzerService,
    @inject('NutritionAnalysisRepository') private analysisRepository: NutritionAnalysisRepository
  ) {}

  async execute(request: AnalyzeNutritionRequestDto): Promise<AnalyzeNutritionResponseDto[]> {
    logger.info('🍎 Iniciando análisis nutricional', { 
      databaseId: request.databaseId,
      pageId: request.pageId,
      limit: request.limit 
    });

    try {
      // 1. Obtener pageIds pendientes
      const pageIds = request.pageId 
        ? [request.pageId]
        : await this.notionRepository.getPendingPageIds(request.databaseId, request.limit);

      if (pageIds.length === 0) {
        logger.warn('⚠️ No se encontraron páginas para analizar');
        return [];
      }

      logger.info('📄 Páginas pendientes obtenidas', { count: pageIds.length });

      const results: AnalyzeNutritionResponseDto[] = [];

      // 2. Procesar cada página
      for (const pageId of pageIds) {
        try {
          // Verificar si ya existe análisis para esta página
          const existingAnalysis = await this.analysisRepository.findByNotionPageId(pageId);
          if (existingAnalysis) {
            logger.info('✅ Análisis ya existe para página', { pageId });
            results.push(this.mapToDto(existingAnalysis));
            continue;
          }

          // Obtener TODAS las imágenes de la página
          const imageData = await this.notionRepository.getAllImagesFromPage(pageId);
          
          if (!imageData || imageData.images.length === 0) {
            logger.warn('⚠️ No se encontraron imágenes en la página', { pageId });
            continue;
          }

          // Analizar todas las imágenes en conjunto (funciona para 1 o más imágenes)
          logger.info('🔍 Analizando imágenes', { 
            pageId,
            totalImages: imageData.images.length 
          });

          const analysisResult = await this.nutritionAnalyzer.analyzeImagesNutrition(
            imageData.images,
            imageData.extractedDateTime,
            imageData.additionalInfo || ''
          );
          
          const analysisNotes = imageData.images.length > 1 
            ? `Análisis combinado de ${imageData.images.length} imágenes: ${analysisResult.analysisNotes}`
            : analysisResult.analysisNotes;

          // 3. Crear entidad de análisis nutricional
          const now = new Date();
          const nutritionAnalysis = new NutritionAnalysis(
            uuidv4(),
            now,
            now,
            imageData.images[0].imageUrl, // URL representativa
            imageData.extractedDateTime,
            analysisResult.calories,
            analysisResult.nutritionalCategories,
            analysisNotes,
            pageId
          );

          // 4. Persistir análisis localmente
          const savedAnalysis = await this.analysisRepository.save(nutritionAnalysis);
          logger.info('💾 Análisis guardado localmente', { 
            id: savedAnalysis.id,
            pageId,
            totalImages: imageData.images.length
          });

          // 5. Actualizar página en Notion
          const presentCategories: string[] = [];
          const categories = analysisResult.nutritionalCategories;
          if (categories.vegetables.present) presentCategories.push(`Verduras (${categories.vegetables.portion})`);
          if (categories.fruits.present) presentCategories.push(`Frutas (${categories.fruits.portion})`);
          if (categories.proteins.present) presentCategories.push(`Proteínas (${categories.proteins.portion})`);
          if (categories.sugars.present) presentCategories.push(`Azúcares (${categories.sugars.portion})`);
          if (categories.processedFoods.present) presentCategories.push(`Procesados (${categories.processedFoods.portion})`);
          
          await this.notionRepository.updatePageWithNutritionAnalysis({
            pageId,
            calories: analysisResult.calories.totalCalories,
            nutrients: presentCategories.length > 0 ? presentCategories : ['Sin categorías identificadas'],
            analysisNotes: String(analysisNotes || 'Sin notas adicionales'),
            extractedDateTime: imageData.extractedDateTime
          });

          logger.info('✅ Página de Notion actualizada', { pageId });

          results.push(this.mapToDto(savedAnalysis));

        } catch (error) {
          logger.error('❌ Error procesando página', { 
            pageId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Continuar con la siguiente página en caso de error
          continue;
        }
      }

      logger.info('🏁 Análisis nutricional completado', { 
        totalProcessed: results.length,
        totalPages: pageIds.length 
      });

      return results;

    } catch (error) {
      logger.error('❌ Error en análisis nutricional', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private mapToDto(analysis: NutritionAnalysis): AnalyzeNutritionResponseDto {
    return {
      id: analysis.id,
      imageUrl: analysis.imageUrl,
      extractedDateTime: analysis.extractedDateTime,
      calories: analysis.calories,
      nutritionalCategories: analysis.nutritionalCategories,
      analysisNotes: analysis.analysisNotes,
      notionPageId: analysis.notionPageId,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt
    };
  }
}
