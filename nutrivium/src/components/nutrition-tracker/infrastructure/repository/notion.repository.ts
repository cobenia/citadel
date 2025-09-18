import { injectable, inject } from 'inversify';
import { Client } from '@notionhq/client';
import axios from 'axios';
import sharp from 'sharp';
import exifr from 'exifr';
import { logger } from '@/shared/domain/logger/logger';
import { Config } from '@/shared/domain/definition/config';
import { 
  NotionRepository, 
  NotionImageData, 
  NotionUpdateData 
} from '../../domain/repository/notion.repository';

@injectable()
export class NotionRepositoryImpl implements NotionRepository {
  private notion: Client;
  private config: Config;

  constructor(@inject('Config') config: Config) {
    this.config = config;
    this.notion = new Client({ auth: this.config.notion.apiKey });
    
    logger.info('🔗 NotionRepository inicializado', {
      databaseId: this.config.notion.databaseId.substring(0, 8) + '...'
    });
  }

  async getImagesFromDatabase(databaseId: string, limit = 10): Promise<NotionImageData[]> {
    try {
      logger.info('🔍 Obteniendo imágenes desde base de datos de Notion', { 
        databaseId,
        limit 
      });

      // Filtrar por páginas que NO tengan "Hora comida" (están pendientes de procesar)
      const response = await this.notion.databases.query({
        database_id: databaseId,
        page_size: limit,
        filter: {
          property: 'Hora comida',
          date: {
            is_empty: true
          }
        }
      });

      logger.info('📄 Páginas pendientes obtenidas desde Notion', { count: response.results.length });

      const imageDataPromises = response.results.map(async (page: any) => {
        try {
          return await this.extractImageDataFromPage(page);
        } catch (error) {
          logger.warn('⚠️ Error extrayendo imagen de página', { 
            pageId: page.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      });

      const imageData = (await Promise.all(imageDataPromises))
        .filter((data): data is NotionImageData => data !== null);

      logger.info('✅ Imágenes extraídas de Notion', { count: imageData.length });
      return imageData;

    } catch (error) {
      logger.error('❌ Error obteniendo imágenes desde Notion', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getImageFromPage(pageId: string): Promise<NotionImageData | null> {
    try {
      logger.info('🔍 Obteniendo imagen desde página de Notion', { pageId });

      const page = await this.notion.pages.retrieve({ page_id: pageId });
      return await this.extractImageDataFromPage(page);

    } catch (error) {
      logger.error('❌ Error obteniendo imagen desde página', {
        pageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async extractDateTimeFromPage(pageId: string): Promise<Date | null> {
    try {
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      
      // Intentar extraer fecha de diferentes propiedades comunes
      const properties = (page as any).properties;
      
      // Buscar en propiedades de fecha comunes
      for (const propName of ['Date', 'Created', 'Timestamp', 'When', 'Fecha', 'Hora', 'Hora comida']) {
        const prop = properties[propName];
        if (prop?.date?.start) {
          return new Date(prop.date.start);
        }
      }

      // Usar created_time como fallback
      return new Date((page as any).created_time);

    } catch (error) {
      logger.warn('⚠️ Error extrayendo fecha desde página', {
        pageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async updatePageWithNutritionAnalysis(updateData: NotionUpdateData): Promise<boolean> {
    try {
      logger.info('💾 Actualizando página con análisis nutricional', { 
        pageId: updateData.pageId 
      });

      // Primero obtener las propiedades existentes para saber cuáles actualizar
      const page = await this.notion.pages.retrieve({ page_id: updateData.pageId });
      const properties = (page as any).properties;
      
      const updateProps: any = {};

      // Actualizar "Hora comida" con fecha EXIF de la imagen (si existe)
      if (properties['Hora comida']) {
        const fechaHora = updateData.extractedDateTime || new Date(); // Fallback a fecha actual si no hay EXIF
        updateProps['Hora comida'] = {
          date: {
            start: fechaHora.toISOString()
          }
        };
        
        logger.debug('📅 Actualizando Hora comida', {
          fechaExtraida: updateData.extractedDateTime?.toISOString(),
          fechaUsada: fechaHora.toISOString(),
          fuenteFecha: updateData.extractedDateTime ? 'EXIF' : 'Fallback'
        });
      }

      // Solo actualizar propiedades que existen
      if (properties['Calories'] || properties['Calorias']) {
        const propName = properties['Calories'] ? 'Calories' : 'Calorias';
        updateProps[propName] = { number: updateData.calories };
      }

      if (properties['Elementos']) {
        // Solo extraer nombres básicos para multi-select (sin comas)
        const cleanNutrients = updateData.nutrients
          .slice(0, 10)
          .map(nutrient => {
            // Limpiar el nombre para que sea compatible con multi-select
            const cleanName = nutrient.split(',')[0].trim();
            return { name: cleanName };
          });
        
        updateProps['Elementos'] = {
          multi_select: cleanNutrients
        };
      }

      // Campo específico para análisis alimentario (rich_text)
      if (properties['Análisis alimentario']) {
        updateProps['Análisis alimentario'] = {
          rich_text: [{ text: { content: updateData.analysisNotes.substring(0, 2000) } }]
        };
      }

      // Campos de notas legacy (por compatibilidad)
      if (properties['Analysis Notes'] || properties['Notas']) {
        const propName = properties['Analysis Notes'] ? 'Analysis Notes' : 'Notas';
        updateProps[propName] = {
          rich_text: [{ text: { content: updateData.analysisNotes.substring(0, 2000) } }]
        };
      }

      // NOTA: "Información adicional" NO se modifica - es campo de entrada del usuario

      if (properties['Analyzed'] || properties['Analizado']) {
        const propName = properties['Analyzed'] ? 'Analyzed' : 'Analizado';
        updateProps[propName] = { checkbox: true };
      }

      if (Object.keys(updateProps).length > 0) {
        await this.notion.pages.update({
          page_id: updateData.pageId,
          properties: updateProps
        });
        
        logger.info('✅ Página actualizada exitosamente', { 
          pageId: updateData.pageId,
          propsUpdated: Object.keys(updateProps)
        });
      } else {
        logger.warn('⚠️ No se encontraron propiedades para actualizar', { pageId: updateData.pageId });
      }

      return true;

    } catch (error) {
      logger.error('❌ Error actualizando página de Notion', {
        pageId: updateData.pageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async getPendingAnalysisPages(databaseId: string): Promise<NotionImageData[]> {
    try {
      logger.info('🔍 Obteniendo páginas pendientes de análisis', { databaseId });

      // Usar el mismo filtro que getImagesFromDatabase
      return this.getImagesFromDatabase(databaseId);

    } catch (error) {
      logger.error('❌ Error obteniendo páginas pendientes', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async extractImageDataFromPage(page: any): Promise<NotionImageData | null> {
    try {
      const properties = (page as any).properties;
      
      // Buscar archivos adjuntos en la propiedad "Foto" primero
      let imageUrl: string | null = null;
      let additionalInfo = '';

      // Buscar específicamente en la propiedad "Foto" 
      if (properties['Foto'] && properties['Foto'].type === 'files' && properties['Foto'].files?.length > 0) {
        const file = properties['Foto'].files[0];
        if (file.file?.url || file.external?.url) {
          imageUrl = file.file?.url || file.external?.url;
          logger.info('📎 Foto encontrada en propiedad Foto', { fileName: file.name });
        }
      }

      // Si no se encuentra en "Foto", buscar en otras propiedades de archivos
      if (!imageUrl) {
        for (const [propName, prop] of Object.entries(properties)) {
          if ((prop as any).type === 'files' && (prop as any).files?.length > 0) {
            const file = (prop as any).files[0];
            if (file.file?.url || file.external?.url) {
              imageUrl = file.file?.url || file.external?.url;
              logger.info('📎 Archivo encontrado en propiedad', { propName, fileName: file.name });
              break;
            }
          }
        }
      }

      // Si no se encuentra en propiedades, buscar en blocks (contenido de la página)
      if (!imageUrl) {
        const blocks = await this.notion.blocks.children.list({
          block_id: page.id
        });

        for (const block of blocks.results) {
          if ((block as any).type === 'image') {
            const imageBlock = block as any;
            imageUrl = imageBlock.image.file?.url || imageBlock.image.external?.url;
            if (imageUrl) {
              logger.info('🖼️ Imagen encontrada en bloque', { blockId: block.id });
              break;
            }
          }
          // También buscar en archivos adjuntos en blocks
          else if ((block as any).type === 'file') {
            const fileBlock = block as any;
            const fileUrl = fileBlock.file.file?.url || fileBlock.file.external?.url;
            if (fileUrl && this.isImageFile(fileUrl)) {
              imageUrl = fileUrl;
              logger.info('📁 Archivo de imagen encontrado en bloque', { blockId: block.id });
              break;
            }
          }
        }
      }

      if (!imageUrl) {
        logger.debug('🔍 No se encontró imagen en la página', { pageId: page.id });
        return null;
      }

      // Extraer información adicional de las propiedades para contexto
      additionalInfo = this.extractAdditionalInfo(properties);

      // Descargar imagen original para extraer EXIF
      const originalBuffer = await this.downloadOriginalImage(imageUrl);
      
      // Extraer fecha EXIF de la imagen original
      const extractedDateTime = await this.extractImageCreationDate(originalBuffer);
      
      // Optimizar imagen para procesamiento
      const imageBuffer = await this.optimizeImage(originalBuffer);

      return {
        imageUrl,
        extractedDateTime,
        pageId: page.id,
        imageBuffer,
        additionalInfo
      };

    } catch (error) {
      logger.error('❌ Error extrayendo datos de imagen', {
        pageId: page.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private extractAdditionalInfo(properties: any): string {
    const info: string[] = [];
    
    // Extraer información relevante de las propiedades
    for (const [propName, prop] of Object.entries(properties)) {
      const propData = prop as any;
      
      // Saltar propiedades que no son de información adicional
      if (['Foto', 'Hora comida', 'Calories', 'Calorias', 'Elementos', 'Nutrients', 'Análisis alimentario', 'Analysis Notes', 'Notas', 'Analyzed', 'Analizado'].includes(propName)) {
        continue;
      }
      
      // Texto enriquecido
      if (propData.type === 'rich_text' && propData.rich_text?.length > 0) {
        const text = propData.rich_text.map((t: any) => t.plain_text).join(' ');
        if (text.trim()) {
          info.push(`${propName}: ${text}`);
        }
      }
      
      // Título
      else if (propData.type === 'title' && propData.title?.length > 0) {
        const title = propData.title.map((t: any) => t.plain_text).join(' ');
        if (title.trim()) {
          info.push(`Título: ${title}`);
        }
      }
      
      // Número
      else if (propData.type === 'number' && propData.number !== null) {
        info.push(`${propName}: ${propData.number}`);
      }
      
      // Select
      else if (propData.type === 'select' && propData.select?.name) {
        info.push(`${propName}: ${propData.select.name}`);
      }
      
      // Multi-select
      else if (propData.type === 'multi_select' && propData.multi_select?.length > 0) {
        const options = propData.multi_select.map((opt: any) => opt.name).join(', ');
        info.push(`${propName}: ${options}`);
      }
    }
    
    return info.join('; ');
  }

  private isImageFile(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  private async downloadOriginalImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 30000 // 30 seconds timeout
      });
      
      return Buffer.from(response.data);

    } catch (error) {
      logger.error('❌ Error descargando imagen original', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async optimizeImage(originalBuffer: Buffer): Promise<Buffer> {
    try {
      // Optimizar imagen usando sharp
      const buffer = await sharp(originalBuffer)
        .resize(1024, 1024, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return buffer;

    } catch (error) {
      logger.error('❌ Error optimizando imagen', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async extractImageCreationDate(imageBuffer: Buffer): Promise<Date | null> {
    try {
      // Intentar extraer metadatos EXIF de la imagen original
      const exifData = await exifr.parse(imageBuffer, {
        pick: ['DateTimeOriginal', 'DateTime', 'DateTimeDigitized', 'CreateDate']
      });

      if (exifData) {
        // Priorizar DateTimeOriginal (fecha cuando se tomó la foto)
        const creationDate = exifData.DateTimeOriginal || 
                           exifData.CreateDate || 
                           exifData.DateTime || 
                           exifData.DateTimeDigitized;

        if (creationDate) {
          logger.info('📅 Fecha EXIF extraída', { 
            originalDate: creationDate.toISOString(),
            source: exifData.DateTimeOriginal ? 'DateTimeOriginal' : 'Alternativa'
          });
          return new Date(creationDate);
        }
      }

      logger.warn('⚠️ No se encontraron metadatos EXIF de fecha en la imagen');
      return null;

    } catch (error) {
      logger.warn('⚠️ Error extrayendo metadatos EXIF', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}
