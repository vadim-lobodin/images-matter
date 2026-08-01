interface ImageDataObject {
  image_url?: { url?: string }
  url?: string
  b64_json?: string
  data?: string
}

type ImageData = string | ImageDataObject

export interface ImageApiResponse {
  choices: Array<{
    message: {
      content?: string
      images?: ImageData[]
    }
  }>
}

export function extractImagesFromResponse(response: ImageApiResponse): string[] {
  return response.choices.flatMap((choice) =>
    (choice.message.images ?? []).map((imageData) => {
      let dataUrl = ''

      if (typeof imageData === 'string') {
        dataUrl = imageData
      } else {
        dataUrl =
          imageData.image_url?.url ??
          imageData.url ??
          imageData.b64_json ??
          imageData.data ??
          ''
      }

      return dataUrl && !dataUrl.startsWith('data:')
        ? `data:image/png;base64,${dataUrl}`
        : dataUrl
    }).filter(Boolean)
  )
}

export function getApiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const record = payload as Record<string, unknown>
  const error = record.error

  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string') return message
  }

  for (const key of ['message', 'detail']) {
    if (typeof record[key] === 'string') return record[key]
  }

  return undefined
}
