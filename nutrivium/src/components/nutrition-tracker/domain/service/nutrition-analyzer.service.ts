import { CalorieInfo, NutritionalCategories } from '../entity/nutrition-analysis.entity';

export interface NutritionAnalysisResult {
  calories: CalorieInfo;
  nutritionalCategories: NutritionalCategories;
  analysisNotes: string;
}

export interface NutritionAnalyzerService {
  /**
   * Analiza múltiples imágenes en conjunto (varios platos de una comida)
   * @param images Array de buffers e URLs de imágenes
   * @param extractedDateTime Fecha y hora extraída de metadatos
   * @param additionalInfo Información adicional de contexto de la página
   * @returns Análisis nutricional combinado de todas las imágenes
   */
  analyzeImagesNutrition(
    images: { imageBuffer: Buffer; imageUrl: string }[],
    extractedDateTime: Date | null,
    additionalInfo?: string
  ): Promise<NutritionAnalysisResult>;
}
