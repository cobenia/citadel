import { injectable, inject } from 'inversify';
import OpenAI from 'openai';
import { logger } from '@/shared/domain/logger/logger';
import { Config } from '@/shared/domain/definition/config';
import { TemplateService } from './template.service';
import { 
  NutritionAnalyzerService, 
  NutritionAnalysisResult 
} from '../../domain/service/nutrition-analyzer.service';
import { 
  NutritionalCategories,
  NutritionalCategoryInfo,
  CalorieInfo 
} from '../../domain/entity/nutrition-analysis.entity';

@injectable()
export class OpenAINutritionAnalyzerServiceImpl implements NutritionAnalyzerService {
  private openai: OpenAI;
  private config: Config;
  private templateService: TemplateService;

  constructor(
    @inject('Config') config: Config,
    @inject('TemplateService') templateService: TemplateService
  ) {
    this.config = config;
    this.templateService = templateService;
    this.openai = new OpenAI({ apiKey: this.config.openai.apiKey });
    
    logger.info('🤖 OpenAI NutritionAnalyzer inicializado', {
      model: this.config.openai.model
    });
  }

  async analyzeImageNutrition(imageBuffer: Buffer, imageUrl: string): Promise<NutritionAnalysisResult> {
    return this.analyzeImageNutritionWithContext(imageBuffer, imageUrl, null, '');
  }

  async analyzeImageNutritionWithContext(
    imageBuffer: Buffer, 
    imageUrl: string, 
    extractedDateTime: Date | null,
    additionalInfo: string = ''
  ): Promise<NutritionAnalysisResult> {
    try {
      logger.info('🍎 Analizando imagen con OpenAI', { 
        imageUrl: imageUrl.substring(0, 50) + '...',
        hasDateTime: !!extractedDateTime,
        hasAdditionalInfo: !!additionalInfo,
        model: this.config.openai.model
      });

      // Convertir buffer a base64
      const base64Image = imageBuffer.toString('base64');
      
      // Construir contextos
      const timeContext = extractedDateTime 
        ? `La imagen fue tomada el ${extractedDateTime.toLocaleDateString()} a las ${extractedDateTime.toLocaleTimeString()}.`
        : '';
      
      const infoContext = additionalInfo 
        ? `Información adicional de contexto: ${additionalInfo}`
        : '';

      // Obtener prompt desde template
      const prompt = this.templateService.getNutritionAnalysisPrompt(timeContext, infoContext);

      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        ...(this.config.openai.model.includes('gpt-5') ? {} : { temperature: 0.2 }), // gpt-5 no soporta temperature personalizada
        response_format: this.templateService.getNutritionAnalysisResponseFormat()
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No se recibió respuesta de OpenAI');
      }

      // Parsear respuesta JSON
      const analysisData = this.parseOpenAIResponse(content);
      
      logger.info('✅ Análisis nutricional completado', {
        totalCalories: analysisData.calories.totalCalories,
        categoriesPresent: this.countPresentCategories(analysisData.nutritionalCategories),
        avgConfidence: this.calculateAverageConfidence(analysisData),
        hasAdditionalInfo: !!additionalInfo
      });

      return analysisData;

    } catch (error) {
      logger.error('❌ Error en análisis nutricional con OpenAI', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Devolver análisis de fallback en caso de error
      return this.getFallbackAnalysis();
    }
  }

  private parseOpenAIResponse(content: string): NutritionAnalysisResult {
    try {
      // Limpiar respuesta y extraer JSON válido
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validar estructura de la respuesta
      if (!parsedData.calories || !parsedData.nutritionalCategories || !parsedData.analysisNotes) {
        throw new Error('Estructura de respuesta inválida');
      }

      // Validar y convertir categorías nutricionales
      const nutritionalCategories: NutritionalCategories = {
        vegetables: this.validateCategoryInfo(parsedData.nutritionalCategories.vegetables),
        fruits: this.validateCategoryInfo(parsedData.nutritionalCategories.fruits),
        proteins: this.validateCategoryInfo(parsedData.nutritionalCategories.proteins),
        sugars: this.validateCategoryInfo(parsedData.nutritionalCategories.sugars),
        processedFoods: this.validateCategoryInfo(parsedData.nutritionalCategories.processedFoods)
      };

      const calories: CalorieInfo = {
        totalCalories: Number(parsedData.calories.totalCalories) || 0,
        caloriesRange: {
          min: Number(parsedData.calories.caloriesRange?.min) || 0,
          max: Number(parsedData.calories.caloriesRange?.max) || 0
        },
        confidence: Math.max(0, Math.min(1, Number(parsedData.calories.confidence) || 0.5))
      };

      return {
        calories,
        nutritionalCategories,
        analysisNotes: String(parsedData.analysisNotes || 'Análisis completado')
      };

    } catch (error) {
      logger.warn('⚠️ Error parseando respuesta de OpenAI, usando fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.getFallbackAnalysis();
    }
  }

  private validateCategoryInfo(categoryData: any): NutritionalCategoryInfo {
    return {
      present: Boolean(categoryData?.present) || false,
      portion: this.validatePortion(categoryData?.portion),
      confidence: Math.max(0, Math.min(1, Number(categoryData?.confidence) || 0.5))
    };
  }

  private validatePortion(portion: string): 'alta' | 'media' | 'baja' {
    if (portion === 'alta' || portion === 'media' || portion === 'baja') {
      return portion;
    }
    return 'baja'; // Default
  }

  private countPresentCategories(categories: NutritionalCategories): number {
    let count = 0;
    if (categories.vegetables.present) count++;
    if (categories.fruits.present) count++;
    if (categories.proteins.present) count++;
    if (categories.sugars.present) count++;
    if (categories.processedFoods.present) count++;
    return count;
  }

  private calculateAverageConfidence(analysis: NutritionAnalysisResult): number {
    const allConfidences = [
      analysis.calories.confidence,
      analysis.nutritionalCategories.vegetables.confidence,
      analysis.nutritionalCategories.fruits.confidence,
      analysis.nutritionalCategories.proteins.confidence,
      analysis.nutritionalCategories.sugars.confidence,
      analysis.nutritionalCategories.processedFoods.confidence
    ];
    
    return allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length;
  }

  private getFallbackAnalysis(): NutritionAnalysisResult {
    const defaultCategory: NutritionalCategoryInfo = {
      present: false,
      portion: 'baja',
      confidence: 0.1
    };

    return {
      calories: {
        totalCalories: 0,
        caloriesRange: { min: 0, max: 0 },
        confidence: 0.1
      },
      nutritionalCategories: {
        vegetables: defaultCategory,
        fruits: defaultCategory,
        proteins: defaultCategory,
        sugars: defaultCategory,
        processedFoods: defaultCategory
      },
      analysisNotes: 'No se pudo completar el análisis nutricional. Por favor, intente con una imagen más clara o verifique la conectividad con OpenAI.'
    };
  }
}
