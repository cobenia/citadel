import { BaseEntity } from '@/shared/domain/entity/base-entity';

export interface NutritionalCategoryInfo {
  present: boolean;
  portion: 'alta' | 'media' | 'baja';
  confidence: number; // 0-1
}

export interface NutritionalCategories {
  vegetables: NutritionalCategoryInfo;
  fruits: NutritionalCategoryInfo;
  proteins: NutritionalCategoryInfo;
  sugars: NutritionalCategoryInfo;
  processedFoods: NutritionalCategoryInfo;
}

export interface CalorieInfo {
  totalCalories: number;
  caloriesRange: {
    min: number;
    max: number;
  };
  confidence: number; // 0-1
}

export class NutritionAnalysis extends BaseEntity {
  public readonly imageUrl: string;
  public readonly extractedDateTime: Date | null;
  public readonly calories: CalorieInfo;
  public readonly nutritionalCategories: NutritionalCategories;
  public readonly analysisNotes: string;
  public readonly notionPageId?: string;

  constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    imageUrl: string,
    extractedDateTime: Date | null,
    calories: CalorieInfo,
    nutritionalCategories: NutritionalCategories,
    analysisNotes: string,
    notionPageId?: string
  ) {
    super(id, createdAt, updatedAt);
    this.imageUrl = imageUrl;
    this.extractedDateTime = extractedDateTime;
    this.calories = calories;
    this.nutritionalCategories = nutritionalCategories;
    this.analysisNotes = analysisNotes;
    this.notionPageId = notionPageId;
  }
}
