# Prompt para Análisis Nutricional con OpenAI

Analiza esta imagen de comida enfocándote en las **categorías nutricionales principales** para análisis de hábitos alimentarios.

{{timeContext}}
{{infoContext}}

## Instrucciones específicas:

### Objetivo del análisis:
Este análisis es para rastrear hábitos alimentarios diarios, NO para inventario detallado de ingredientes.

### Para cada categoría nutricional evalúa:

**VEGETABLES (Verduras y vegetales):**
- Incluye: ensaladas, verduras cocidas, vegetales crudos, hortalizas
- Porción alta: >50% del plato, media: 25-50%, baja: <25%

**FRUITS (Frutas):**
- Incluye: frutas frescas, frutas cocidas, jugos naturales
- Porción alta: >1 pieza grande o equivalente, media: 1 pieza, baja: <1 pieza

**PROTEINS (Proteínas):**
- Incluye: carnes, pescado, huevos, legumbres, lácteos, frutos secos
- Porción alta: >150g, media: 100-150g, baja: <100g

**SUGARS (Azúcares y dulces):**
- Incluye: postres, dulces, bebidas azucaradas, pasteles, salsas dulces
- Porción alta: >2 elementos dulces, media: 1-2 elementos, baja: trazas/condimentos

**PROCESSED FOODS (Alimentos procesados):**
- Incluye: comida rápida, frituras, embutidos, snacks empaquetados, comida ultra-procesada
- Porción alta: >75% procesado, media: 25-75%, baja: <25%

### En analysisNotes, enfócate en:

- Balance nutricional general del plato
- Si cumple con recomendaciones de vegetales/frutas diarias
- Nivel de procesamiento de los alimentos
- Sugerencias para mejorar el balance nutricional
- Evaluación de la calidad nutricional general (excelente/buena/regular/pobre)

### Reglas adicionales:

- Sé preciso en determinar si cada categoría está "presente" o no
- Las porciones son relativas al contenido total del plato/comida
- Prioriza la identificación de patrones alimentarios sobre detalles específicos
- Si hay dudas, marca confidence más bajo pero sé decisivo en present: true/false
- Analiza cuidadosamente todos los elementos visibles en la imagen
- Considera las preparaciones culinarias que puedan afectar el contenido nutricional
