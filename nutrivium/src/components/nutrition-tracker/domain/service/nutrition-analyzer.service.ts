import { CalorieInfo, NutritionalCategories } from '../entity/nutrition-analysis.entity';

export interface NutritionAnalysisResult {
  calories: CalorieInfo;
  nutritionalCategories: NutritionalCategories;
  analysisNotes: string;
}

export interface NutritionAnalyzerService {
  /**
   * Analiza una imagen para extraer información nutricional
   * @param imageBuffer Buffer de la imagen a analizar
   * @param imageUrl URL de la imagen para referencia
   * @returns Análisis nutricional completo
   */
  analyzeImageNutrition(imageBuffer: Buffer, imageUrl: string): Promise<NutritionAnalysisResult>;

  /**
   * Analiza una imagen con contexto adicional
   * @param imageBuffer Buffer de la imagen
   * @param imageUrl URL de la imagen
   * @param extractedDateTime Fecha y hora extraída de metadatos
   * @param additionalInfo Información adicional de contexto de la página
   * @returns Análisis nutricional con contexto temporal y adicional
   */
  analyzeImageNutritionWithContext(
    imageBuffer: Buffer, 
    imageUrl: string, 
    extractedDateTime: Date | null,
    additionalInfo?: string
  ): Promise<NutritionAnalysisResult>;
}
