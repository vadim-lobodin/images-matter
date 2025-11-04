import type { Meta, StoryObj } from '@storybook/react'
import { ModelSelector } from '@/components/cascade/ModelSelector'
import type { ModelKey } from '@/lib/models'

const meta: Meta<typeof ModelSelector> = {
  title: 'Components/ModelSelector',
  component: ModelSelector,
}

export default meta
type Story = StoryObj<typeof ModelSelector>

export const Default: Story = {
  args: {
    value: 'vertex_ai/gemini-2.5-flash-image' as ModelKey,
    onChange: (model: ModelKey) => console.log('Model changed:', model),
  },
}

export const Gemini20FlashPreview: Story = {
  args: {
    value: 'vertex_ai/gemini-2.0-flash-preview-image-generation' as ModelKey,
    onChange: (model: ModelKey) => console.log('Model changed:', model),
  },
}
