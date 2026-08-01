import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RecipeMenu } from '@/components/cascade/RecipeMenu'
import type { Recipe, RecipeInfluence } from '@/lib/recipes'

const recipe: Recipe = {
  id: 'storybook-recipe',
  name: 'Soft editorial',
  prompt: 'Muted colors, diffused side light, restrained composition, and subtle film grain.',
  defaultInfluence: 'balanced',
  createdAt: 0,
  updatedAt: 0,
}

const meta: Meta<typeof RecipeMenu> = {
  title: 'Components/RecipeMenu',
  component: RecipeMenu,
  parameters: {
    layout: 'centered',
  },
  args: {
    apiMode: 'litellm',
    activeRecipe: null,
    onApply: (selectedRecipe: Recipe) => console.log('Apply recipe:', selectedRecipe.name),
    onInfluenceChange: (influence: RecipeInfluence) => console.log('Influence:', influence),
    onRecipeUpdated: (updatedRecipe: Recipe) => console.log('Updated recipe:', updatedRecipe.name),
    onRecipeDeleted: (id: string) => console.log('Deleted recipe:', id),
    onClose: () => console.log('Close recipe menu'),
  },
}

export default meta
type Story = StoryObj<typeof RecipeMenu>

export const Library: Story = {}

export const WithAttachedRecipe: Story = {
  args: {
    activeRecipe: {
      recipe,
      influence: 'balanced',
    },
  },
}
