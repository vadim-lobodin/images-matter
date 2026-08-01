import type { RecipeInfluence, RecipeReference } from './recipes'

const INFLUENCE_INSTRUCTIONS: Record<RecipeInfluence, string> = {
  flexible:
    'Use the recipe as broad inspiration. Borrow its visual language where helpful, but prioritize the current request and allow substantial variation.',
  balanced:
    'Follow the recipe closely for style, palette, lighting, materials, and composition while adapting the subject and details to the current request.',
  strict:
    `Treat the recipe reference as a binding visual blueprint. Match every observable visual parameter unless the current request explicitly asks to change it:
- Camera: point of view, camera height, angle, distance, perspective, focal-length character, lens compression, crop, framing, and orientation.
- Composition: subject scale and placement, horizon, balance, symmetry, negative space, foreground and background relationships, and edge spacing.
- Focus: focus plane, depth of field, sharpness falloff, bokeh character, and motion treatment.
- Lighting: direction, elevation, softness, source size, intensity ratios, exposure, contrast, shadow shape, highlight behavior, and atmosphere.
- Appearance: palette, white balance, saturation, materials, texture, grain, finish, rendering medium, and post-processing.
Only replace the subject or details required by the current request. Do not reinterpret, redesign, improve, or vary the reference setup. Preserve the reference framing as closely as the selected output aspect ratio permits.`,
}

interface ComposeGenerationPromptOptions {
  prompt: string
  promptHistory?: string[]
  sourceImageIds?: number[]
  sourceImageCount?: number
  recipe?: RecipeReference
}

export function composeGenerationPrompt({
  prompt,
  promptHistory,
  sourceImageIds,
  sourceImageCount = 0,
  recipe,
}: ComposeGenerationPromptOptions): string {
  const sections: string[] = []

  if (promptHistory && promptHistory.length > 0) {
    const history = promptHistory.map((previousPrompt, index) => `${index + 1}. "${previousPrompt}"`)
    sections.push(`[Context - Previous editing iterations:]\n${history.join('\n')}`)
  }

  if (sourceImageCount > 0) {
    const ids = sourceImageIds && sourceImageIds.length === sourceImageCount
      ? sourceImageIds
      : Array.from({ length: sourceImageCount }, (_, index) => index + 1)
    sections.push(
      `[Edit targets:]\nImages ${ids.join(', ')} are source images selected by the user. Apply the current request to these images.`
    )
  }

  if (recipe) {
    const recipeLines = [
      `[Recipe: ${recipe.name}]`,
      INFLUENCE_INSTRUCTIONS[recipe.influence],
    ]

    if (recipe.prompt?.trim()) {
      recipeLines.push(`Recipe guidance: ${recipe.prompt.trim()}`)
    }

    if (recipe.imageData) {
      const referenceImageNumber = sourceImageCount + 1
      recipeLines.push(recipe.influence === 'strict'
        ? `Image ${referenceImageNumber} is the binding visual blueprint for the output. It is not an edit target: use the subject requested by the user, but reproduce this image's complete camera, composition, focus, lighting, color, material, and finishing setup. Before finalizing, compare the result against Image ${referenceImageNumber} and correct visible deviations.`
        : `Image ${referenceImageNumber} is a visual recipe reference only. Do not treat it as an edit target or assume its subject must appear in the result.`)
    }

    sections.push(recipeLines.join('\n'))
  }

  sections.push(`[Current request:]\n${prompt.trim()}`)
  if (recipe?.influence === 'strict') {
    sections.push(
      '[Strict recipe priority:]\nThe current request controls only the requested subject or explicit changes. The recipe controls all remaining visual execution. When they do not directly conflict, match the recipe rather than introducing variation.'
    )
  }
  return sections.join('\n\n')
}
