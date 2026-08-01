'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Add,
  AiGenerate,
  ArrowLeft,
  Checkmark,
  Copy,
  Edit,
  ImageReference,
  TrashCan,
  Upload,
} from '@carbon/icons-react'
import { deleteRecipe, getAllRecipes, saveRecipe } from '@/lib/recipe-store'
import {
  RECIPE_INFLUENCE_LABELS,
  type AppliedRecipe,
  type Recipe,
  type RecipeImage,
  type RecipeInfluence,
  recipeInfluenceFromIndex,
  recipeInfluenceToIndex,
} from '@/lib/recipes'
import { cn } from '@/lib/utils'
import { BlobImage } from '@/components/ui/BlobImage'

interface RecipeMenuProps {
  apiMode: 'litellm' | 'gemini'
  activeRecipe: AppliedRecipe | null
  onApply: (recipe: Recipe) => void
  onInfluenceChange: (influence: RecipeInfluence) => void
  onRecipeUpdated: (recipe: Recipe) => void
  onRecipeDeleted: (id: string) => void
  onClose: () => void
}

interface RecipeDraft {
  name: string
  prompt: string
  image?: RecipeImage
  defaultInfluence: RecipeInfluence
}

const EMPTY_DRAFT: RecipeDraft = {
  name: '',
  prompt: '',
  defaultInfluence: 'balanced',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatImageType(mimeType: string): string {
  return mimeType.replace('image/', '').replace('jpeg', 'JPEG').toUpperCase()
}

function RecipeThumbnail({ recipe, size = 48 }: { recipe: Recipe; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
      style={{ width: size, height: size }}
    >
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <ImageReference size={Math.max(18, size / 2)} />
      </div>
      {recipe.image?.thumbnailBlob ? (
        <BlobImage
          blob={recipe.image.thumbnailBlob}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  )
}

export function RecipeMenu({
  apiMode,
  activeRecipe,
  onApply,
  onInfluenceChange,
  onRecipeUpdated,
  onRecipeDeleted,
  onClose,
}: RecipeMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_DRAFT)
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    getAllRecipes()
      .then((storedRecipes) => {
        if (isCurrent) setRecipes(storedRecipes)
      })
      .catch((loadError) => {
        console.error('Failed to load recipes:', loadError)
        if (isCurrent) {
          setRecipes([])
          setError('Recipes could not be loaded from this browser')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const showLibrary = () => {
    setEditingRecipe(null)
    setIsCreating(false)
    setDraft(EMPTY_DRAFT)
    setError(null)
  }

  const startCreating = () => {
    setEditingRecipe(null)
    setIsCreating(true)
    setDraft(EMPTY_DRAFT)
    setError(null)
  }

  const startEditing = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setIsCreating(false)
    setDraft({
      name: recipe.name,
      prompt: recipe.prompt ?? '',
      image: recipe.image,
      defaultInfluence: recipe.defaultInfluence,
    })
    setError(null)
  }

  const analyzeStyle = async (image: RecipeImage, overwritePrompt: boolean) => {
    setIsAnalyzingStyle(true)
    setError(null)

    try {
      const { analyzeRecipeStyle } = await import('@/lib/recipe-style-analysis')
      let analysis: Awaited<ReturnType<typeof analyzeRecipeStyle>>

      if (apiMode === 'gemini') {
        const apiKey = localStorage.getItem('gemini_api_key')
        if (!apiKey) throw new Error('Add your Google API key in Settings to describe styles automatically')
        analysis = await analyzeRecipeStyle({ mode: 'gemini', image: image.blob, apiKey })
      } else {
        const apiKey = localStorage.getItem('litellm_api_key')
        const baseURL = localStorage.getItem('litellm_proxy_url')
        if (!apiKey || !baseURL) throw new Error('Add your proxy credentials in Settings to describe styles automatically')
        analysis = await analyzeRecipeStyle({ mode: 'litellm', image: image.blob, apiKey, baseURL })
      }

      setDraft((current) => {
        if (current.image?.blob !== image.blob) return current
        return {
          ...current,
          name: current.name.trim() ? current.name : analysis.name,
          prompt: overwritePrompt || !current.prompt.trim() ? analysis.description : current.prompt,
        }
      })
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Could not describe this style')
    } finally {
      setIsAnalyzingStyle(false)
    }
  }

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsProcessingImage(true)
    setError(null)
    try {
      const { processRecipeImage } = await import('@/lib/recipe-image')
      const image = await processRecipeImage(file)
      setDraft((current) => ({ ...current, image }))
      if (!draft.name.trim() || !draft.prompt.trim()) await analyzeStyle(image, false)
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Failed to process the image')
    } finally {
      setIsProcessingImage(false)
    }
  }

  const handleSave = async () => {
    const name = draft.name.trim()
    const prompt = draft.prompt.trim()
    if (!name) {
      setError('Give this recipe a name')
      return
    }
    if (!prompt && !draft.image) {
      setError('Add a prompt, a reference image, or both')
      return
    }

    const now = Date.now()
    const recipe: Recipe = {
      id: editingRecipe?.id ?? crypto.randomUUID(),
      name,
      prompt: prompt || undefined,
      image: draft.image,
      defaultInfluence: draft.defaultInfluence,
      createdAt: editingRecipe?.createdAt ?? now,
      updatedAt: now,
    }

    setIsSaving(true)
    setError(null)
    try {
      await saveRecipe(recipe)
      setRecipes((current) => [recipe, ...(current ?? []).filter((item) => item.id !== recipe.id)])
      if (activeRecipe?.recipe.id === recipe.id) onRecipeUpdated(recipe)
      showLibrary()
    } catch (saveError) {
      console.error('Failed to save recipe:', saveError)
      setError('This recipe could not be saved. Browser storage may be full.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async (recipe: Recipe) => {
    const now = Date.now()
    const duplicate: Recipe = {
      ...recipe,
      id: crypto.randomUUID(),
      name: `${recipe.name} copy`,
      createdAt: now,
      updatedAt: now,
    }

    try {
      await saveRecipe(duplicate)
      setRecipes((current) => [duplicate, ...(current ?? [])])
    } catch (duplicateError) {
      console.error('Failed to duplicate recipe:', duplicateError)
      setError('This recipe could not be duplicated')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }

    try {
      await deleteRecipe(id)
      setRecipes((current) => (current ?? []).filter((recipe) => recipe.id !== id))
      onRecipeDeleted(id)
      setConfirmDeleteId(null)
    } catch (deleteError) {
      console.error('Failed to delete recipe:', deleteError)
      setError('This recipe could not be deleted')
    }
  }

  const isEditing = isCreating || editingRecipe !== null

  return (
    <section
      role="dialog"
      aria-label="Recipe library"
      className="flex max-h-[min(620px,calc(100vh-160px))] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-black/5 bg-neutral-100/95 text-foreground shadow-2xl backdrop-blur-[20px] dark:border-white/10 dark:bg-neutral-800/95"
    >
      <header className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={showLibrary}
              className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Back to recipe library"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <ImageReference size={20} />
          )}
          <h2 className="font-semibold">{isEditing ? (editingRecipe ? 'Edit recipe' : 'New recipe') : 'Recipes'}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          Close
        </button>
      </header>

      {isEditing ? (
        <div className="overflow-y-auto p-4">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={80}
                autoFocus
                placeholder="Editorial photography"
                className="w-full rounded-xl border border-black/10 bg-white/55 px-3 py-2.5 outline-none focus:border-foreground/30 dark:border-white/10 dark:bg-black/20"
              />
            </label>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-medium">
                <label htmlFor="recipe-prompt">Recipe prompt <span className="font-normal text-muted-foreground">optional</span></label>
                {draft.image ? (
                  <button
                    type="button"
                    onClick={() => draft.image && analyzeStyle(draft.image, true)}
                    disabled={isAnalyzingStyle || isProcessingImage}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-black/5 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/10"
                  >
                    <AiGenerate size={14} />
                    {isAnalyzingStyle ? 'Analyzing…' : 'Analyze image'}
                  </button>
                ) : null}
              </div>
              <textarea
                id="recipe-prompt"
                value={draft.prompt}
                onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
                maxLength={2000}
                rows={3}
                placeholder="Muted colors, soft side light, subtle film grain..."
                className="w-full resize-none rounded-xl border border-black/10 bg-white/55 px-3 py-2.5 outline-none focus:border-foreground/30 dark:border-white/10 dark:bg-black/20"
              />
            </div>

            <div>
              <div className="mb-1.5 text-sm font-medium">Reference image <span className="font-normal text-muted-foreground">optional</span></div>
              {draft.image ? (
                <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/40 p-2 dark:border-white/10 dark:bg-black/10">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageReference size={24} />
                    </div>
                    <BlobImage
                      blob={draft.image.thumbnailBlob}
                      alt="Recipe reference preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{draft.image.width} × {draft.image.height}</p>
                    <p className="text-xs text-muted-foreground">
                      {draft.image.isOriginal ? 'Original ' : ''}{formatImageType(draft.image.mimeType)} · {formatFileSize(draft.image.blob.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, image: undefined }))}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                    aria-label="Remove reference image"
                  >
                    <TrashCan size={17} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-white/30 px-4 py-6 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground disabled:opacity-50 dark:border-white/15 dark:bg-black/10"
                >
                  <Upload size={18} />
                  {isProcessingImage ? 'Reading image…' : 'Choose PNG, JPEG, or WebP'}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageSelected}
                className="hidden"
              />
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Default influence</legend>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/5 p-1 dark:bg-black/20">
                {(['flexible', 'balanced', 'strict'] as const).map((influence) => (
                  <button
                    key={influence}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, defaultInfluence: influence }))}
                    aria-pressed={draft.defaultInfluence === influence}
                    className={cn(
                      'rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                      draft.defaultInfluence === influence
                        ? 'bg-white text-foreground shadow-sm dark:bg-white/15'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {RECIPE_INFLUENCE_LABELS[influence]}
                  </button>
                ))}
              </div>
            </fieldset>

            {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isProcessingImage || isAnalyzingStyle}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Checkmark size={18} />
              {isSaving ? 'Saving…' : 'Save recipe'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeRecipe ? (
            <div className="border-b border-black/5 p-4 dark:border-white/10">
              <p className="mb-3 truncate text-sm font-semibold">{activeRecipe.recipe.name}</p>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">Influence</span>
                  <span className="text-muted-foreground">{RECIPE_INFLUENCE_LABELS[activeRecipe.influence]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={recipeInfluenceToIndex(activeRecipe.influence)}
                  onChange={(event) => onInfluenceChange(recipeInfluenceFromIndex(Number(event.target.value)))}
                  className="w-full accent-foreground"
                  aria-label="Recipe influence"
                />
                <div className="flex justify-between text-[11px]">
                  {(['flexible', 'balanced', 'strict'] as const).map((influence) => (
                    <button
                      key={influence}
                      type="button"
                      onClick={() => onInfluenceChange(influence)}
                      aria-pressed={activeRecipe.influence === influence}
                      className={cn(
                        'rounded px-1 py-0.5 text-muted-foreground hover:text-foreground',
                        activeRecipe.influence === influence && 'font-medium text-foreground'
                      )}
                    >
                      {RECIPE_INFLUENCE_LABELS[influence]}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          ) : null}

          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Library</h3>
              <p className="text-xs text-muted-foreground">Stored only in this browser</p>
            </div>
            <button
              type="button"
              onClick={startCreating}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Add size={17} /> New
            </button>
          </div>

          <div className="min-h-32 overflow-y-auto px-2 pb-3">
            {recipes === null ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">Loading recipes…</p>
            ) : recipes.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <ImageReference size={26} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">No recipes yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Save a prompt, a reference image, or both.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recipes.map((recipe) => {
                  const isActive = activeRecipe?.recipe.id === recipe.id
                  return (
                    <div
                      key={recipe.id}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl p-2 transition-colors',
                        isActive ? 'bg-white/70 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onApply(recipe)
                          onClose()
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        aria-label={`Use ${recipe.name}`}
                      >
                        <RecipeThumbnail recipe={recipe} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{recipe.name}</span>
                            {isActive ? <Checkmark size={14} className="shrink-0" /> : null}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {recipe.prompt || 'Image reference'}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEditing(recipe)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                          aria-label={`Edit ${recipe.name}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(recipe)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                          aria-label={`Duplicate ${recipe.name}`}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(recipe.id)}
                          onBlur={() => setConfirmDeleteId((current) => current === recipe.id ? null : current)}
                          className={cn(
                            'rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10',
                            confirmDeleteId === recipe.id && 'bg-red-500/10 text-red-600 dark:text-red-400'
                          )}
                          aria-label={confirmDeleteId === recipe.id ? `Confirm delete ${recipe.name}` : `Delete ${recipe.name}`}
                          title={confirmDeleteId === recipe.id ? 'Click again to delete' : 'Delete'}
                        >
                          <TrashCan size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {error ? <p role="alert" className="px-2 pt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
        </>
      )}
    </section>
  )
}
