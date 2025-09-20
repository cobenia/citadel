import { injectable } from 'inversify';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@/shared/domain/logger/logger';

@injectable()
export class TemplateService {
  private templates: Map<string, string> = new Map();
  private responseFormats: Map<string, any> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    try {
      // Cargar template de prompt
      const templatePath = join(__dirname, '../templates/nutrition-analysis-prompt.md');
      const template = readFileSync(templatePath, 'utf-8');
      this.templates.set('nutrition-analysis', template);

      // Cargar response format
      const responseFormatPath = join(__dirname, '../templates/nutrition-analysis-prompt_response.json');
      const responseFormat = JSON.parse(readFileSync(responseFormatPath, 'utf-8'));
      this.responseFormats.set('nutrition-analysis', responseFormat);

      logger.info('✅ Templates y response formats cargados exitosamente', {
        templatesCount: this.templates.size,
        responseFormatsCount: this.responseFormats.size
      });
    } catch (error) {
      logger.error('❌ Error cargando templates o response formats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  getNutritionAnalysisPrompt(timeContext: string, infoContext: string): string {
    const template = this.templates.get('nutrition-analysis');
    if (!template) {
      throw new Error('Template nutrition-analysis no encontrado');
    }

    return template
      .replace('{{timeContext}}', timeContext)
      .replace('{{infoContext}}', infoContext);
  }

  getMultipleImagesNutritionAnalysisPrompt(imageCount: number, timeContext: string, infoContext: string): string {
    const template = this.templates.get('nutrition-analysis');
    if (!template) {
      throw new Error('Template nutrition-analysis no encontrado');
    }

    const multipleImagesPrefix = `IMPORTANTE: Estoy proporcionando ${imageCount} imágenes que representan DIFERENTES PLATOS O ELEMENTOS de una MISMA COMIDA. 
Analiza TODAS las imágenes en conjunto y proporciona un análisis nutricional COMBINADO que incluya todos los alimentos mostrados en todas las imágenes.
Las ${imageCount} imágenes son parte de la misma comida/sesión alimentaria.

`;

    const modifiedTemplate = multipleImagesPrefix + template;

    return modifiedTemplate
      .replace('{{timeContext}}', timeContext)
      .replace('{{infoContext}}', infoContext);
  }

  getNutritionAnalysisResponseFormat(): any {
    const responseFormat = this.responseFormats.get('nutrition-analysis');
    if (!responseFormat) {
      throw new Error('Response format nutrition-analysis no encontrado');
    }
    return responseFormat;
  }
}
