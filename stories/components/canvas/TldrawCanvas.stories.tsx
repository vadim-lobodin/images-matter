import type { Meta, StoryObj } from '@storybook/react'
import { TldrawCanvas } from '@/components/canvas/TldrawCanvas'

const meta: Meta<typeof TldrawCanvas> = {
  title: 'Canvas/TldrawCanvas',
  component: TldrawCanvas,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof TldrawCanvas>

export const Default: Story = {
  args: {
    onSelectionChange: (images) => console.log('Selection changed:', images),
    onReady: (editor) => console.log('Editor ready:', editor),
  },
  parameters: {
    docs: {
      description: {
        story: 'The infinite canvas powered by tldraw. This is where generated images are displayed and can be moved, resized, and organized.',
      },
    },
  },
}

export const WithCustomShapes: Story = {
  args: {
    onSelectionChange: (images) => console.log('Selection changed:', images),
    onReady: (editor) => {
      console.log('Editor ready:', editor)
      // Note: In a real story, you could add custom shapes here
      // but this requires async operations and proper tldraw initialization
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Canvas supports custom "generated-image" shapes with metadata like prompt, model, timestamp, etc.',
      },
    },
  },
}

export const Interactive: Story = {
  args: {
    onSelectionChange: (images) => console.log('Selection changed:', images.length, 'images'),
    onReady: (editor) => console.log('Editor ready, you can now interact with the canvas'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Try interacting with the canvas - pan with mouse, zoom with scroll, select with click. Drop images from your desktop to see them appear on the canvas.',
      },
    },
  },
}
