export const RECIPE_INFLUENCES = ['flexible', 'balanced', 'strict'] as const

export type RecipeInfluence = (typeof RECIPE_INFLUENCES)[number]

export interface RecipeImage {
  blob: Blob
  thumbnailBlob: Blob
  mimeType: string
  width: number
  height: number
  isOriginal?: boolean
}

export interface Recipe {
  id: string
  name: string
  prompt?: string
  image?: RecipeImage
  defaultInfluence: RecipeInfluence
  createdAt: number
  updatedAt: number
}

export interface AppliedRecipe {
  recipe: Recipe
  influence: RecipeInfluence
}

export interface RecipeReference {
  name: string
  prompt?: string
  imageData?: string
  influence: RecipeInfluence
}

export interface RecipeSnapshot {
  id: string
  name: string
  prompt?: string
  influence: RecipeInfluence
}

export const RECIPE_INFLUENCE_LABELS: Record<RecipeInfluence, string> = {
  flexible: 'Flexible',
  balanced: 'Balanced',
  strict: 'Strict',
}

export function recipeInfluenceFromIndex(index: number): RecipeInfluence {
  const safeIndex = Math.min(RECIPE_INFLUENCES.length - 1, Math.max(0, Math.round(index)))
  return RECIPE_INFLUENCES[safeIndex]
}

export function recipeInfluenceToIndex(influence: RecipeInfluence): number {
  return RECIPE_INFLUENCES.indexOf(influence)
}

export function toRecipeSnapshot(appliedRecipe: AppliedRecipe): RecipeSnapshot {
  return {
    id: appliedRecipe.recipe.id,
    name: appliedRecipe.recipe.name,
    prompt: appliedRecipe.recipe.prompt,
    influence: appliedRecipe.influence,
  }
}
