#!/usr/bin/env ts-node
import { container } from '@/config/di/module/nutrition-tracker.module';
import { AnalyzeImageNutritionUseCase } from '@/components/nutrition-tracker/application/use-case/analyze-image-nutrition.use-case';
import { Config } from '@/shared/domain/definition/config';
import { logger } from '@/shared/domain/logger/logger';

async function main() {
  try {
    logger.info('🚀 Iniciando script de análisis nutricional');

    // Obtener configuración desde DI container
    const config = container.get<Config>('Config');
    const databaseId = config.notion.databaseId;

    // Obtener parámetros de línea de comandos
    const args = process.argv.slice(2);
    const pageId = args.find(arg => arg.startsWith('--page='))?.split('=')[1];
    const limitStr = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
    const limit = limitStr ? parseInt(limitStr, 10) : 5;

    logger.info('📋 Configuración del análisis', {
      databaseId: databaseId.substring(0, 8) + '...',
      pageId: pageId || 'No especificado (analizará múltiples páginas)',
      limit,
      appName: config.app.name,
      appVersion: config.app.version,
      openaiModel: config.openai.model
    });

    // Obtener use case desde DI container
    const analyzeUseCase = container.get<AnalyzeImageNutritionUseCase>(AnalyzeImageNutritionUseCase);

    // Ejecutar análisis
    const results = await analyzeUseCase.execute({
      databaseId,
      pageId,
      limit
    });

    if (results.length === 0) {
      logger.warn('⚠️ No se encontraron imágenes para analizar');
      return;
    }

    // Mostrar resultados
    logger.info('🏁 Análisis completado exitosamente');
    
    for (const result of results) {
      console.log('\n' + '='.repeat(60));
      console.log(`📄 Página: ${result.notionPageId}`);
      console.log(`🖼️  Imagen: ${result.imageUrl.substring(0, 50)}...`);
      console.log(`📅 Fecha: ${result.extractedDateTime?.toLocaleString() || 'No disponible'}`);
      console.log(`🔥 Calorías: ${result.calories.totalCalories} (${result.calories.caloriesRange.min}-${result.calories.caloriesRange.max})`);
      console.log(`🎯 Confianza calorías: ${Math.round(result.calories.confidence * 100)}%`);
      
      console.log('\n🥗 Categorías Nutricionales:');
      let categoryIndex = 1;
      
      if (result.nutritionalCategories.vegetables.present) {
        console.log(`  ${categoryIndex++}. VERDURAS: ${result.nutritionalCategories.vegetables.portion} (Confianza: ${Math.round(result.nutritionalCategories.vegetables.confidence * 100)}%)`);
      }
      if (result.nutritionalCategories.fruits.present) {
        console.log(`  ${categoryIndex++}. FRUTAS: ${result.nutritionalCategories.fruits.portion} (Confianza: ${Math.round(result.nutritionalCategories.fruits.confidence * 100)}%)`);
      }
      if (result.nutritionalCategories.proteins.present) {
        console.log(`  ${categoryIndex++}. PROTEÍNAS: ${result.nutritionalCategories.proteins.portion} (Confianza: ${Math.round(result.nutritionalCategories.proteins.confidence * 100)}%)`);
      }
      if (result.nutritionalCategories.sugars.present) {
        console.log(`  ${categoryIndex++}. AZÚCARES: ${result.nutritionalCategories.sugars.portion} (Confianza: ${Math.round(result.nutritionalCategories.sugars.confidence * 100)}%)`);
      }
      if (result.nutritionalCategories.processedFoods.present) {
        console.log(`  ${categoryIndex++}. PROCESADOS: ${result.nutritionalCategories.processedFoods.portion} (Confianza: ${Math.round(result.nutritionalCategories.processedFoods.confidence * 100)}%)`);
      }
      
      if (categoryIndex === 1) {
        console.log('  No se identificaron categorías nutricionales claras');
      }
      
      console.log(`\n📝 Notas: ${result.analysisNotes}`);
      console.log(`⏰ Procesado: ${result.createdAt.toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(60));
    logger.info('✅ Script completado exitosamente', { 
      totalAnalyzed: results.length,
      appName: config.app.name
    });

  } catch (error) {
    logger.error('❌ Error en script de análisis', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Ejecutar script
if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Error fatal en script', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  });
}
