import type { Meta, StoryObj } from '@storybook/react'
import { FloatingToolbar } from '@/components/canvas/FloatingToolbar'
import type { ModelKey } from '@/lib/models'

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
  },
}

export const EditMode: Story = {
  args: {
    ...Default.args,
    selectedImagesCount: 2,
    prompt: 'Make the sky more dramatic',
  },
}
