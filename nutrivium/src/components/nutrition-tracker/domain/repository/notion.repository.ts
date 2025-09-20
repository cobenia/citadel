export interface NotionImageData {
  images: {
    imageUrl: string;
    imageBuffer: Buffer;
  }[];
  extractedDateTime: Date | null;
  pageId: string;
  additionalInfo?: string;
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
   * Obtiene IDs de páginas pendientes desde una base de datos de Notion
   * @param databaseId ID de la base de datos de Notion
   * @param limit Límite de páginas a procesar
   * @returns Array de IDs de páginas pendientes
   */
  getPendingPageIds(databaseId: string, limit?: number): Promise<string[]>;

  /**
   * Obtiene TODAS las imágenes desde una página de Notion
   * @param pageId ID de la página de Notion
   * @returns Datos de todas las imágenes con metadatos
   */
  getAllImagesFromPage(pageId: string): Promise<NotionImageData | null>;

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
}
