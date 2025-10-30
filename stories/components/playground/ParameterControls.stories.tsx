import type { Meta, StoryObj } from '@storybook/react'
import { ParameterControls } from '@/components/playground/ParameterControls'
import type { ModelKey } from '@/lib/models'

const meta: Meta<typeof ParameterControls> = {
  title: 'Playground/ParameterControls',
  component: ParameterControls,
  tags: ['autodocs'],
  argTypes: {
    model: {
      control: 'select',
      options: ['vertex_ai/gemini-2.5-flash-image', 'vertex_ai/gemini-2.0-flash-preview-image-generation'],
    },
    aspectRatio: {
      control: 'select',
      options: ['1:1', '3:4', '4:3', '9:16', '16:9'],
    },
    imageSize: {
      control: 'select',
      options: ['1K', '2K'],
    },
    numImages: {
      control: { type: 'number', min: 1, max: 4 },
    },
  },
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

export const Landscape: Story = {
  args: {
    model: 'vertex_ai/gemini-2.5-flash-image' as ModelKey,
    aspectRatio: '16:9',
    imageSize: '2K',
    numImages: 2,
    onAspectRatioChange: (ratio: string) => console.log('Aspect ratio changed:', ratio),
    onImageSizeChange: (size: string) => console.log('Image size changed:', size),
    onNumImagesChange: (num: number) => console.log('Num images changed:', num),
  },
}

export const Portrait: Story = {
  args: {
    model: 'vertex_ai/gemini-2.5-flash-image' as ModelKey,
    aspectRatio: '9:16',
    imageSize: '1K',
    numImages: 4,
    onAspectRatioChange: (ratio: string) => console.log('Aspect ratio changed:', ratio),
    onImageSizeChange: (size: string) => console.log('Image size changed:', size),
    onNumImagesChange: (num: number) => console.log('Num images changed:', num),
  },
}

export const HighResolution: Story = {
  args: {
    model: 'vertex_ai/gemini-2.5-flash-image' as ModelKey,
    aspectRatio: '4:3',
    imageSize: '2K',
    numImages: 1,
    onAspectRatioChange: (ratio: string) => console.log('Aspect ratio changed:', ratio),
    onImageSizeChange: (size: string) => console.log('Image size changed:', size),
    onNumImagesChange: (num: number) => console.log('Num images changed:', num),
  },
}
