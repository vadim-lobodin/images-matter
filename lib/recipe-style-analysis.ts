import { getApiErrorMessage } from './image-api'
import { blobToDataUrl } from './recipe-image'

const STYLE_ANALYSIS_PROMPT = `Analyze this image as a reusable visual style reference for an image generator.

Return only valid JSON in this exact shape:
{"name":"Short style name","description":"Compact style description"}

The name must be 2 to 5 words and describe the visual style, not the subject. The description must be 25 to 40 words and prioritize camera angle, point of view, framing, perspective, lens character, depth of field, lighting, composition, palette, texture, and medium.

Do not identify or describe specific subjects, people, brands, or written content. Abstract them into a style that can be applied to a different subject.`

const MAX_NAME_LENGTH = 60
const MAX_DESCRIPTION_LENGTH = 360

export interface RecipeStyleAnalysis {
  name: string
  description: string
}

interface LiteLLMStyleAnalysisRequest {
  mode: 'litellm'
  image: Blob
  apiKey: string
  baseURL: string
}

interface DirectGeminiStyleAnalysisRequest {
  mode: 'gemini'
  image: Blob
  apiKey: string
}

export type RecipeStyleAnalysisRequest =
  | LiteLLMStyleAnalysisRequest
  | DirectGeminiStyleAnalysisRequest

function extractLiteLLMText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const choices = (payload as Record<string, unknown>).choices
  if (!Array.isArray(choices)) return undefined

  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') continue
    const message = (choice as Record<string, unknown>).message
    if (!message || typeof message !== 'object') continue
    const content = (message as Record<string, unknown>).content

    if (typeof content === 'string' && content.trim()) return content.trim()
    if (Array.isArray(content)) {
      const text = content
        .map((part) => {
          if (!part || typeof part !== 'object') return ''
          const value = (part as Record<string, unknown>).text
          return typeof value === 'string' ? value : ''
        })
        .join('')
        .trim()
      if (text) return text
    }
  }

  return undefined
}

function extractGeminiText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const candidates = (payload as Record<string, unknown>).candidates
  if (!Array.isArray(candidates)) return undefined

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const content = (candidate as Record<string, unknown>).content
    if (!content || typeof content !== 'object') continue
    const parts = (content as Record<string, unknown>).parts
    if (!Array.isArray(parts)) continue

    const text = parts
      .map((part) => {
        if (!part || typeof part !== 'object') return ''
        const value = (part as Record<string, unknown>).text
        return typeof value === 'string' ? value : ''
      })
      .join('')
      .trim()
    if (text) return text
  }

  return undefined
}

async function getResponseError(response: Response): Promise<string> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return `Style analysis failed (${response.status})`
  }

  return getApiErrorMessage(payload) ?? `Style analysis failed (${response.status})`
}

function cleanJsonResponse(response: string): string {
  const cleaned = response
    .replace(/^```(?:json|text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  return firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned
}

function truncateAtWord(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized

  const truncated = normalized.slice(0, maxLength - 1)
  const lastSpace = truncated.lastIndexOf(' ')
  const endIndex = lastSpace > 0 ? lastSpace : truncated.length
  return `${truncated.slice(0, endIndex).trim()}…`
}

function parseAnalysis(response: string): RecipeStyleAnalysis {
  let parsed: unknown
  try {
    parsed = JSON.parse(cleanJsonResponse(response))
  } catch {
    throw new Error('The style model returned an invalid description')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('The style model returned an invalid description')
  }

  const record = parsed as Record<string, unknown>
  if (typeof record.name !== 'string' || typeof record.description !== 'string') {
    throw new Error('The style model returned an invalid description')
  }

  const name = truncateAtWord(record.name, MAX_NAME_LENGTH)
  const description = truncateAtWord(record.description, MAX_DESCRIPTION_LENGTH)
  if (!name || !description) throw new Error('The style model returned an empty description')

  return { name, description }
}

async function analyzeWithLiteLLM(
  request: LiteLLMStyleAnalysisRequest,
  imageData: string
): Promise<RecipeStyleAnalysis> {
  const cleanBaseURL = request.baseURL.replace(/\/$/, '')
  const response = await fetch(`${cleanBaseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: 'vertex_ai/gemini-2.5-flash-lite',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: STYLE_ANALYSIS_PROMPT },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        },
      ],
      max_tokens: 220,
      temperature: 0.2,
    }),
  })

  if (!response.ok) throw new Error(await getResponseError(response))

  const content = extractLiteLLMText(await response.json())
  if (!content) throw new Error('The style model returned no description')
  return parseAnalysis(content)
}

async function analyzeWithGemini(
  request: DirectGeminiStyleAnalysisRequest,
  imageData: string
): Promise<RecipeStyleAnalysis> {
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('The reference image could not be read')

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': request.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: STYLE_ANALYSIS_PROMPT },
              { inlineData: { mimeType: match[1], data: match[2] } },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 220,
          temperature: 0.2,
        },
      }),
    }
  )

  if (!response.ok) throw new Error(await getResponseError(response))

  const content = extractGeminiText(await response.json())
  if (!content) throw new Error('The style model returned no description')
  return parseAnalysis(content)
}

export async function analyzeRecipeStyle(request: RecipeStyleAnalysisRequest): Promise<RecipeStyleAnalysis> {
  const imageData = await blobToDataUrl(request.image)
  return request.mode === 'litellm'
    ? analyzeWithLiteLLM(request, imageData)
    : analyzeWithGemini(request, imageData)
}
