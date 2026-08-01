import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FloatingToolbar } from '@/components/canvas/FloatingToolbar'
import type { ModelKey } from '@/lib/models'
import type { Recipe } from '@/lib/recipes'

const editorialThumbnail = new Blob([
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#c8b7a6"/><circle cx="32" cy="25" r="13" fill="#f3e9dc"/><path d="M12 64c2-17 10-25 20-25s18 8 20 25" fill="#6b5548"/></svg>',
], { type: 'image/svg+xml' })

const editorialRecipe: Recipe = {
  id: 'storybook-editorial',
  name: 'Soft editorial',
  prompt: 'Muted colors, diffused side light, restrained composition, and subtle film grain.',
  image: {
    blob: editorialThumbnail,
    thumbnailBlob: editorialThumbnail,
    mimeType: 'image/svg+xml',
    width: 64,
    height: 64,
    isOriginal: true,
  },
  defaultInfluence: 'balanced',
  createdAt: 0,
  updatedAt: 0,
}

const meta: Meta<typeof FloatingToolbar> = {
  title: 'Components/FloatingToolbar',
  component: FloatingToolbar,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof FloatingToolbar>

export const Default: Story = {
  args: {
    prompt: '',
    onPromptChange: (prompt: string) => console.log('Prompt changed:', prompt),
    model: 'vertex_ai/gemini-2.5-flash-image' as ModelKey,
    onModelChange: (model: ModelKey) => console.log('Model changed:', model),
    aspectRatio: '1:1',
    onAspectRatioChange: (ratio: string) => console.log('Aspect ratio changed:', ratio),
    imageSize: '1K',
    onImageSizeChange: (size: string) => console.log('Image size changed:', size),
    numImages: 1,
    onNumImagesChange: (num: number) => console.log('Num images changed:', num),
    activeGenerationsCount: 0,
    onGenerate: () => console.log('Generate clicked'),
    onOpenUpload: () => console.log('Open upload clicked'),
    onOpenSettings: () => console.log('Open settings clicked'),
    selectedImagesCount: 0,
    apiMode: 'litellm',
    activeRecipe: null,
    onRecipeApply: (recipe: Recipe) => console.log('Recipe applied:', recipe.name),
    onRecipeRemove: () => console.log('Recipe removed'),
    onRecipeInfluenceChange: (influence) => console.log('Recipe influence:', influence),
    onRecipeUpdated: (recipe: Recipe) => console.log('Recipe updated:', recipe.name),
    onRecipeDeleted: (id: string) => console.log('Recipe deleted:', id),
  },
}

export const EditMode: Story = {
  args: {
    ...Default.args,
    selectedImagesCount: 2,
    prompt: 'Make the sky more dramatic',
  },
}

export const WithRecipe: Story = {
  args: {
    ...Default.args,
    prompt: 'A ceramic perfume bottle on a stone pedestal',
    activeRecipe: {
      recipe: editorialRecipe,
      influence: 'balanced',
    },
  },
}
