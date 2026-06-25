# Nutrivium

Servicio de análisis nutricional de imágenes de comida desde Notion. Lee entradas de una base de Notion, analiza las imágenes con un modelo de visión y escribe de vuelta calorías, categorías nutricionales y notas.

## Idioma

Todo en español: comentarios, mensajes de commit, comunicación general. Variables y funciones en inglés (ver convención del monorepo `citadel`, raíz `../AGENTS.md`).

## Arquitectura

Clean Architecture con Inversify DI (mismo patrón que el resto de `citadel`). Un componente principal:

- **`components/nutrition-tracker/`** — domain (entidades, puertos), application (use case `analyze-image-nutrition`), infrastructure (Notion repo, analyzer OpenAI-compatible, templates de prompt).
- **`shared/`** — config, logger, entidades base.

Ver `../AGENTS.md` (raíz de `citadel`) para convenciones de DI, estilo, testing y estructura.

## IA / LLM (ruteo por LiteLLM)

Todo el tráfico de IA pasa por el **proxy LiteLLM del NAS** (OpenAI-compatible, red Docker `ai-net`), no contra la API oficial de OpenAI. El analyzer usa el SDK `openai` (`chat.completions`) apuntando a la baseURL del proxy.

- Cliente: `src/components/nutrition-tracker/infrastructure/service/openai-nutrition-analyzer.service.ts` — construye `new OpenAI({ apiKey, baseURL })`.
- Config: `src/shared/infrastructure/config/config.ts` (env-driven, vía `dotenv`).

Parámetros (env vars):

- `OPENAI_API_KEY` — la **virtual key de LiteLLM** (`key_alias=nutrivium`), no una key oficial de OpenAI.
- `OPENAI_BASE_URL` — baseURL del proxy. Default `http://litellm:4000/v1`. **Vaciar** para usar la API oficial de OpenAI.
- `OPENAI_MODEL` — alias de modelo de LiteLLM. Default `gpt-5.5` (flagship con visión; preserva el tier del `gpt-5`/`gpt-4o` que usaba antes el código). Otros aliases disponibles en el proxy: ver `../../docker-nas/litellm/AGENTS.md`.

El modelo debe soportar **visión** (el analyzer manda imágenes como `image_url`).

### Virtual key de LiteLLM

Regla del NAS: cada servicio usa su propia virtual key (`key_alias` = nombre del servicio) para que el spend se atribuya por servicio. Ver `../../docker-nas/litellm/AGENTS.md` (sección "Virtual keys por servicio"). La key se genera con el master key del NAS (no la generes a mano ni la hardcodees):

```bash
ssh joaquin@192.168.1.77 'bash -s' <<'EOF'
MK=$(sudo -n grep '^LITELLM_MASTER_KEY=' /docker/litellm/.env | cut -d= -f2-)
curl -s http://127.0.0.1:4000/key/generate -H "Authorization: Bearer $MK" \
  -H "Content-Type: application/json" -d '{"key_alias":"nutrivium"}' \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["key"])'
EOF
```

Copiar la key impresa a `OPENAI_API_KEY` en el `.env` del servicio.

## Configuración

- `.env` (gitignored) — secretos y config de runtime. Copiar `.env.example` como base.
- Prioridad: env vars > defaults en código. Ver `src/shared/infrastructure/config/config.ts`.

## Red / despliegue

Para que el cliente resuelva `litellm:4000`, el contenedor de nutrivium debe estar en la red Docker externa **`ai-net`** (mismo patrón que el resto de servicios del NAS). Si nutrivium se ejecuta fuera de esa red, usar la URL pública del proxy o vaciar `OPENAI_BASE_URL` para ir a la API oficial.

## Scripts

```bash
npm run dev              # tsx src/scripts/dev.ts
npm run script:analyze   # tsx src/scripts/analyze.ts
npm run build            # tsc
npm run build:check      # tsc --noEmit (type check)
npm test                 # node:test
```
