import type { Meta, StoryObj } from '@storybook/react'
import { TldrawCanvas } from '@/components/canvas/TldrawCanvas'

const meta: Meta<typeof TldrawCanvas> = {
  title: 'Components/TldrawCanvas',
  component: TldrawCanvas,
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
}

export const Interactive: Story = {
  args: {
    onSelectionChange: (images) => console.log('Selection changed:', images.length, 'images'),
    onReady: (editor) => console.log('Editor ready, you can now interact with the canvas'),
  },
}
