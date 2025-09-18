import { NutritionalCategories } from '../../domain/entity/nutrition-analysis.entity';

export interface AnalyzeNutritionRequestDto {
  databaseId: string;
  pageId?: string;
  limit?: number;
}

export interface CalorieInfoDto {
  totalCalories: number;
  caloriesRange: {
    min: number;
    max: number;
  };
  confidence: number;
}

export interface AnalyzeNutritionResponseDto {
  id: string;
  imageUrl: string;
  extractedDateTime: Date | null;
  calories: CalorieInfoDto;
  nutritionalCategories: NutritionalCategories;
  analysisNotes: string;
  notionPageId?: string;
  createdAt: Date;
  updatedAt: Date;
}
