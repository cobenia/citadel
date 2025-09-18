import { injectable } from 'inversify';
import { logger } from '@/shared/domain/logger/logger';
import { 
  NutritionAnalysisRepository 
} from '../../domain/repository/nutrition-analysis.repository';
import { NutritionAnalysis } from '../../domain/entity/nutrition-analysis.entity';

// Simulación de base de datos en memoria para el MVP
// En producción se reemplazaría por implementación real con Prisma
interface NutritionAnalysisRecord {
  id: string;
  imageUrl: string;
  extractedDateTime: string | null;
  calories: string; // JSON stringified
  nutritionalCategories: string; // JSON stringified
  analysisNotes: string;
  notionPageId?: string;
  createdAt: string;
  updatedAt: string;
}

@injectable()
export class NutritionAnalysisRepositoryImpl implements NutritionAnalysisRepository {
  private inMemoryStore: Map<string, NutritionAnalysisRecord> = new Map();
  private pageIdIndex: Map<string, string> = new Map(); // pageId -> analysisId

  async save(analysis: NutritionAnalysis): Promise<NutritionAnalysis> {
    try {
      logger.info('💾 Guardando análisis nutricional', { 
        id: analysis.id,
        notionPageId: analysis.notionPageId 
      });

      const record: NutritionAnalysisRecord = {
        id: analysis.id,
        imageUrl: analysis.imageUrl,
        extractedDateTime: analysis.extractedDateTime?.toISOString() || null,
        calories: JSON.stringify(analysis.calories),
        nutritionalCategories: JSON.stringify(analysis.nutritionalCategories),
        analysisNotes: analysis.analysisNotes,
        notionPageId: analysis.notionPageId,
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString()
      };

      this.inMemoryStore.set(analysis.id, record);
      
      // Actualizar índice por pageId si existe
      if (analysis.notionPageId) {
        this.pageIdIndex.set(analysis.notionPageId, analysis.id);
      }

      logger.info('✅ Análisis guardado exitosamente', { 
        id: analysis.id,
        totalRecords: this.inMemoryStore.size 
      });

      return analysis;

    } catch (error) {
      logger.error('❌ Error guardando análisis nutricional', {
        id: analysis.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findById(id: string): Promise<NutritionAnalysis | null> {
    try {
      logger.debug('🔍 Buscando análisis por ID', { id });

      const record = this.inMemoryStore.get(id);
      if (!record) {
        logger.debug('🔍 Análisis no encontrado', { id });
        return null;
      }

      return this.mapToEntity(record);

    } catch (error) {
      logger.error('❌ Error buscando análisis por ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async findByNotionPageId(notionPageId: string): Promise<NutritionAnalysis | null> {
    try {
      logger.debug('🔍 Buscando análisis por página de Notion', { notionPageId });

      const analysisId = this.pageIdIndex.get(notionPageId);
      if (!analysisId) {
        logger.debug('🔍 Análisis no encontrado para página', { notionPageId });
        return null;
      }

      return this.findById(analysisId);

    } catch (error) {
      logger.error('❌ Error buscando análisis por página de Notion', {
        notionPageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<NutritionAnalysis[]> {
    try {
      logger.debug('🔍 Buscando análisis por rango de fechas', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString() 
      });

      const results: NutritionAnalysis[] = [];

      for (const record of this.inMemoryStore.values()) {
        const recordDate = record.extractedDateTime 
          ? new Date(record.extractedDateTime)
          : new Date(record.createdAt);

        if (recordDate >= startDate && recordDate <= endDate) {
          const entity = this.mapToEntity(record);
          if (entity) {
            results.push(entity);
          }
        }
      }

      logger.debug('✅ Análisis encontrados por rango de fechas', { 
        count: results.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      return results;

    } catch (error) {
      logger.error('❌ Error buscando análisis por rango de fechas', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  async findAll(offset: number, limit: number): Promise<NutritionAnalysis[]> {
    try {
      logger.debug('🔍 Obteniendo todos los análisis', { offset, limit });

      const allRecords = Array.from(this.inMemoryStore.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Más recientes primero
        .slice(offset, offset + limit);

      const results: NutritionAnalysis[] = [];
      for (const record of allRecords) {
        const entity = this.mapToEntity(record);
        if (entity) {
          results.push(entity);
        }
      }

      logger.debug('✅ Análisis obtenidos', { 
        count: results.length,
        offset,
        limit,
        totalRecords: this.inMemoryStore.size 
      });

      return results;

    } catch (error) {
      logger.error('❌ Error obteniendo todos los análisis', {
        offset,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  private mapToEntity(record: NutritionAnalysisRecord): NutritionAnalysis | null {
    try {
      const calories = JSON.parse(record.calories);
      const nutritionalCategories = JSON.parse(record.nutritionalCategories);
      const extractedDateTime = record.extractedDateTime 
        ? new Date(record.extractedDateTime) 
        : null;

      return new NutritionAnalysis(
        record.id,
        new Date(record.createdAt),
        new Date(record.updatedAt),
        record.imageUrl,
        extractedDateTime,
        calories,
        nutritionalCategories,
        record.analysisNotes,
        record.notionPageId
      );

    } catch (error) {
      logger.error('❌ Error mapeando registro a entidad', {
        recordId: record.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}
