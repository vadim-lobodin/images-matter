import type { RecipeInfluence, RecipeReference } from './recipes'

const INFLUENCE_INSTRUCTIONS: Record<RecipeInfluence, string> = {
  flexible:
    'Use the recipe as broad visual inspiration only. Borrow its visual language where helpful, but never borrow its depicted subject or semantic content. Prioritize the current request and allow substantial variation.',
  balanced:
    'Follow the recipe closely for visual treatment, including style, palette, lighting, materials, camera, and composition. Keep the subject and semantic content entirely from the edit target or current request.',
  strict:
    `Treat the recipe reference as a binding visual-treatment and cinematography blueprint, never as a subject or content blueprint. Match every observable visual parameter unless the current request explicitly asks to change it:
- Camera: point of view, camera height, angle, distance, perspective, focal-length character, lens compression, crop, framing, and orientation.
- Composition: subject scale and placement, horizon, balance, symmetry, negative space, foreground and background relationships, and edge spacing.
- Focus: focus plane, depth of field, sharpness falloff, bokeh character, and motion treatment.
- Lighting: direction, elevation, softness, source size, intensity ratios, exposure, contrast, shadow shape, highlight behavior, and atmosphere.
- Appearance: palette, white balance, saturation, materials, texture, grain, finish, rendering medium, and post-processing.
Preserve the edit target's subject identity, object category, defining geometry, components, product design, text, and logos unless the current request explicitly changes them. Do not import any subject, object, person, product, scenery, text, logo, or narrative detail from the recipe image. Preserve the reference's visual setup as closely as the selected output aspect ratio permits.`,
}

export function composeEditTargetImageLabel(imageNumber: number): string {
  return `[EDIT TARGET IMAGE ${imageNumber} — CONTENT SOURCE]\nThis image supplies the subject and content to edit. Preserve its subject identity, object category, defining geometry, components, product design, text, and logos unless the current request explicitly asks to change them.`
}

export function composeRecipeReferenceImageLabel(imageNumber: number): string {
  return `[RECIPE REFERENCE IMAGE ${imageNumber} — VISUAL TREATMENT ONLY — NOT AN EDIT TARGET]\nExtract only transferable visual properties such as camera, point of view, composition, depth of field, lighting, color, texture, materials, medium, and finish. Ignore the identity and semantic content of everything depicted. Never copy its subject, objects, people, products, scenery, text, or logos into the result.`
}

export const RECIPE_REFERENCE_END_LABEL = `[END RECIPE REFERENCE]\nGenerate the requested subject from the current request and EDIT TARGET images. Use the RECIPE REFERENCE only to control how that subject is visually presented. If the edit target and recipe depict different objects or scenes, the edit target always wins. The recipe's depicted content must not appear in the output.`

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

  if (recipe) {
    sections.push(
      `[Non-negotiable input roles:]\nThe current request and EDIT TARGET images determine WHAT is depicted. The recipe determines only HOW it looks. Never transfer the recipe image's subject, objects, people, products, scenery, text, logos, or semantic content into the output. When content conflicts, the current request and EDIT TARGET images always win.`
    )
  }

  if (sourceImageCount > 0) {
    const ids = sourceImageIds && sourceImageIds.length === sourceImageCount
      ? sourceImageIds
      : Array.from({ length: sourceImageCount }, (_, index) => index + 1)
    sections.push(
      `[Edit targets — content authority:]\nImages ${ids.join(', ')} are the source images selected by the user. The output must remain a depiction or edit of their subjects. Preserve their identity, object category, defining geometry, components, product design, text, and logos unless the current request explicitly asks to change them.`
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
        ? `Image ${referenceImageNumber} is the RECIPE REFERENCE. It is a binding blueprint only for visual treatment and cinematography. It is not an edit target or a content source. Reproduce its camera, composition, focus, lighting, color, material, and finishing setup around the EDIT TARGET subject, while excluding every subject, object, person, product, scene element, text, and logo depicted in Image ${referenceImageNumber}. Before finalizing, verify that the target subject was preserved and no recipe content leaked into the result.`
        : `Image ${referenceImageNumber} is the RECIPE REFERENCE only. It controls visual treatment, not subject matter. Do not treat it as an edit target or content source, and do not reproduce anything it depicts.`)
    }

    sections.push(recipeLines.join('\n'))
  }

  sections.push(`[Current request:]\n${prompt.trim()}`)
  if (recipe?.influence === 'strict') {
    sections.push(
      '[Strict recipe priority:]\nCONTENT: the current request and EDIT TARGET images control the subject, object identity, design, and meaning. VISUAL EXECUTION: the current request controls explicit changes and the recipe controls all remaining camera, composition, lighting, focus, color, texture, and finish. Match the recipe strictly only within that visual-execution role.'
    )
  }
  return sections.join('\n\n')
}
