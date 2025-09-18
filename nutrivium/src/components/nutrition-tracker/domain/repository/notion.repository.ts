export interface NotionImageData {
  imageUrl: string;
  extractedDateTime: Date | null;
  pageId: string;
  imageBuffer: Buffer;
  additionalInfo?: string; // Información adicional extraída de la página
}

export interface NotionUpdateData {
  pageId: string;
  calories: number;
  nutrients: string[];
  analysisNotes: string;
  extractedDateTime: Date | null; // Fecha EXIF extraída de la imagen
}

export interface NotionRepository {
  /**
   * Obtiene imágenes desde una base de datos de Notion
   * @param databaseId ID de la base de datos de Notion
   * @param limit Límite de imágenes a procesar
   * @returns Array de datos de imágenes con metadatos
   */
  getImagesFromDatabase(databaseId: string, limit?: number): Promise<NotionImageData[]>;

  /**
   * Obtiene una imagen específica desde una página de Notion
   * @param pageId ID de la página de Notion
   * @returns Datos de la imagen con metadatos
   */
  getImageFromPage(pageId: string): Promise<NotionImageData | null>;

  /**
   * Extrae fecha y hora de los metadatos de la imagen o página
   * @param pageId ID de la página de Notion
   * @returns Fecha extraída o null si no se encuentra
   */
  extractDateTimeFromPage(pageId: string): Promise<Date | null>;

  /**
   * Actualiza una página de Notion con los resultados del análisis nutricional
   * @param updateData Datos del análisis a actualizar en Notion
   * @returns true si se actualizó correctamente
   */
  updatePageWithNutritionAnalysis(updateData: NotionUpdateData): Promise<boolean>;

  /**
   * Obtiene páginas pendientes de análisis nutricional
   * @param databaseId ID de la base de datos
   * @returns Array de páginas sin analizar
   */
  getPendingAnalysisPages(databaseId: string): Promise<NotionImageData[]>;
}
