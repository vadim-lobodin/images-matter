import type { Meta, StoryObj } from '@storybook/react'
import { ParameterControls } from '@/components/cascade/ParameterControls'
import type { ModelKey } from '@/lib/models'

const meta: Meta<typeof ParameterControls> = {
  title: 'Components/ParameterControls',
  component: ParameterControls,
}

export default meta
type Story = StoryObj<typeof ParameterControls>

export const Default: Story = {
  args: {
    model: 'vertex_ai/gemini-2.5-flash-image' as ModelKey,
    aspectRatio: '1:1',
    imageSize: '1K',
    numImages: 1,
    onAspectRatioChange: (ratio: string) => console.log('Aspect ratio changed:', ratio),
    onImageSizeChange: (size: string) => console.log('Image size changed:', size),
    onNumImagesChange: (num: number) => console.log('Num images changed:', num),
  },
}

export const Portrait: Story = {
  args: {
    model: 'vertex_ai/gemini-2.5-flash-image' as ModelKey,
    aspectRatio: '9:16',
    imageSize: '2K',
    numImages: 4,
    onAspectRatioChange: (ratio: string) => console.log('Aspect ratio changed:', ratio),
    onImageSizeChange: (size: string) => console.log('Image size changed:', size),
    onNumImagesChange: (num: number) => console.log('Num images changed:', num),
  },
}
