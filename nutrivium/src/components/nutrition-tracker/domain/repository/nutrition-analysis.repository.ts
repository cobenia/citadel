import { NutritionAnalysis } from '../entity/nutrition-analysis.entity';

export interface NutritionAnalysisRepository {
  /**
   * Guarda un análisis nutricional
   * @param analysis Análisis nutricional a guardar
   * @returns Análisis guardado con ID
   */
  save(analysis: NutritionAnalysis): Promise<NutritionAnalysis>;

  /**
   * Busca un análisis por ID
   * @param id ID del análisis
   * @returns Análisis encontrado o null
   */
  findById(id: string): Promise<NutritionAnalysis | null>;

  /**
   * Busca análisis por página de Notion
   * @param notionPageId ID de la página de Notion
   * @returns Análisis encontrado o null
   */
  findByNotionPageId(notionPageId: string): Promise<NutritionAnalysis | null>;

  /**
   * Busca análisis por rango de fechas
   * @param startDate Fecha de inicio
   * @param endDate Fecha de fin
   * @returns Array de análisis en el rango
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<NutritionAnalysis[]>;

  /**
   * Obtiene todos los análisis con paginación
   * @param offset Offset para paginación
   * @param limit Límite de resultados
   * @returns Array de análisis
   */
  findAll(offset: number, limit: number): Promise<NutritionAnalysis[]>;
}
