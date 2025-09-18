import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/shared/domain/logger/logger';
import { NotionRepository } from '../../domain/repository/notion.repository';
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
      // 1. Obtener imágenes desde Notion
      const imageDataRaw = request.pageId 
        ? [await this.notionRepository.getImageFromPage(request.pageId)]
        : await this.notionRepository.getImagesFromDatabase(request.databaseId, request.limit);

      // Filtrar valores null
      const imageData = imageDataRaw.filter(data => data !== null);

      if (imageData.length === 0) {
        logger.warn('⚠️ No se encontraron imágenes para analizar');
        return [];
      }

      logger.info('📄 Imágenes obtenidas desde Notion', { count: imageData.length });

      const results: AnalyzeNutritionResponseDto[] = [];

      // 2. Procesar cada imagen
      for (const data of imageData) {
        try {
          // Verificar si ya existe análisis para esta página
          const existingAnalysis = await this.analysisRepository.findByNotionPageId(data.pageId);
          if (existingAnalysis) {
            logger.info('✅ Análisis ya existe para página', { pageId: data.pageId });
            results.push(this.mapToDto(existingAnalysis));
            continue;
          }

          // 3. Analizar imagen con OpenAI incluyendo información adicional
          logger.info('🔍 Analizando imagen con OpenAI', { 
            pageId: data.pageId,
            imageUrl: data.imageUrl,
            hasAdditionalInfo: !!data.additionalInfo
          });

          const analysisResult = await this.nutritionAnalyzer.analyzeImageNutritionWithContext(
            data.imageBuffer,
            data.imageUrl,
            data.extractedDateTime,
            data.additionalInfo || ''
          );

          // 4. Crear entidad de análisis nutricional
          const now = new Date();
          const nutritionAnalysis = new NutritionAnalysis(
            uuidv4(),
            now,
            now,
            data.imageUrl,
            data.extractedDateTime,
            analysisResult.calories,
            analysisResult.nutritionalCategories,
            analysisResult.analysisNotes,
            data.pageId
          );

          // 5. Persistir análisis localmente
          const savedAnalysis = await this.analysisRepository.save(nutritionAnalysis);
          logger.info('💾 Análisis guardado localmente', { 
            id: savedAnalysis.id,
            pageId: data.pageId 
          });

          // 6. Actualizar página en Notion con resultados
          const presentCategories: string[] = [];
          const categories = analysisResult.nutritionalCategories;
          if (categories.vegetables.present) presentCategories.push(`Verduras (${categories.vegetables.portion})`);
          if (categories.fruits.present) presentCategories.push(`Frutas (${categories.fruits.portion})`);
          if (categories.proteins.present) presentCategories.push(`Proteínas (${categories.proteins.portion})`);
          if (categories.sugars.present) presentCategories.push(`Azúcares (${categories.sugars.portion})`);
          if (categories.processedFoods.present) presentCategories.push(`Procesados (${categories.processedFoods.portion})`);
          
          await this.notionRepository.updatePageWithNutritionAnalysis({
            pageId: data.pageId,
            calories: analysisResult.calories.totalCalories,
            nutrients: presentCategories.length > 0 ? presentCategories : ['Sin categorías identificadas'],
            analysisNotes: String(analysisResult.analysisNotes || 'Sin notas adicionales'),
            extractedDateTime: data.extractedDateTime // Fecha EXIF extraída
          });

          logger.info('✅ Página de Notion actualizada', { pageId: data.pageId });

          results.push(this.mapToDto(savedAnalysis));

        } catch (error) {
          logger.error('❌ Error procesando imagen', { 
            pageId: data.pageId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Continuar con la siguiente imagen en caso de error
          continue;
        }
      }

      logger.info('🏁 Análisis nutricional completado', { 
        totalProcessed: results.length,
        totalImages: imageData.length 
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
