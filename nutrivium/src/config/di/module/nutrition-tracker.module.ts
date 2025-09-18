import { container } from '@/config/di/shared/index';

// Domain interfaces
import { NotionRepository } from '@/components/nutrition-tracker/domain/repository/notion.repository';
import { NutritionAnalyzerService } from '@/components/nutrition-tracker/domain/service/nutrition-analyzer.service';
import { NutritionAnalysisRepository } from '@/components/nutrition-tracker/domain/repository/nutrition-analysis.repository';

// Infrastructure implementations
import { NotionRepositoryImpl } from '@/components/nutrition-tracker/infrastructure/repository/notion.repository';
import { OpenAINutritionAnalyzerServiceImpl } from '@/components/nutrition-tracker/infrastructure/service/openai-nutrition-analyzer.service';
import { NutritionAnalysisRepositoryImpl } from '@/components/nutrition-tracker/infrastructure/repository/nutrition-analysis.repository';
import { TemplateService } from '@/components/nutrition-tracker/infrastructure/service/template.service';

// Use cases
import { AnalyzeImageNutritionUseCase } from '@/components/nutrition-tracker/application/use-case/analyze-image-nutrition.use-case';

/**
 * Configura las dependencias para el componente nutrition-tracker
 */

// Services
container
  .bind<TemplateService>('TemplateService')
  .to(TemplateService)
  .inSingletonScope();

// Repositories
container
  .bind<NotionRepository>('NotionRepository')
  .to(NotionRepositoryImpl)
  .inSingletonScope();

container
  .bind<NutritionAnalysisRepository>('NutritionAnalysisRepository')
  .to(NutritionAnalysisRepositoryImpl)
  .inSingletonScope();

// Services
container
  .bind<NutritionAnalyzerService>('NutritionAnalyzerService')
  .to(OpenAINutritionAnalyzerServiceImpl)
  .inSingletonScope();

// Use Cases
container
  .bind<AnalyzeImageNutritionUseCase>(AnalyzeImageNutritionUseCase)
  .toSelf()
  .inSingletonScope();

export { container };
