import dotenv from 'dotenv';
import { Config } from '@/shared/domain/definition/config';
import { logger } from '@/shared/domain/logger/logger';

// Cargar variables de entorno desde .env
dotenv.config();

export function loadConfig(): Config {
  logger.info('🔧 Cargando configuración desde variables de entorno');

  // Validar variables requeridas
  const requiredVars = {
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error('❌ Error de configuración', { missingVars });
    throw new Error(errorMessage);
  }

  const config: Config = {
    notion: {
      apiKey: process.env.NOTION_API_KEY!,
      databaseId: process.env.NOTION_DATABASE_ID!,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL || 'gpt-5',
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
    app: {
      name: process.env.APP_NAME || 'nutrivium',
      version: process.env.APP_VERSION || '0.0.1',
    },
  };

  logger.info('✅ Configuración cargada exitosamente', {
    notionApiKey: config.notion.apiKey.substring(0, 8) + '...',
    notionDatabaseId: config.notion.databaseId.substring(0, 8) + '...',
    openaiModel: config.openai.model,
    logLevel: config.logging.level,
    appName: config.app.name,
    appVersion: config.app.version,
  });

  return config;
}
