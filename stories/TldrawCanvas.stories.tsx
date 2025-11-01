import type { Meta, StoryObj } from '@storybook/react'
import { TldrawCanvas } from '@/components/canvas/TldrawCanvas'
import { useEffect, useState } from 'react'

// Wrapper to ensure proper mounting in Storybook
function TldrawCanvasWrapper(props: React.ComponentProps<typeof TldrawCanvas>) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'hsl(var(--background))'
    }}>
      Loading canvas...
    </div>
  }

  return <TldrawCanvas {...props} />
}

const meta: Meta<typeof TldrawCanvas> = {
  title: 'Components/TldrawCanvas',
  component: TldrawCanvasWrapper,
  parameters: {
    layout: 'fullscreen',
    // Disable docs to avoid SSR issues with tldraw
    docs: { disable: true },
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
