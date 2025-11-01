import type { Meta, StoryObj } from '@storybook/react'

// Simple test component
function TestComponent() {
  return <div style={{ padding: '20px' }}>Hello Storybook!</div>
}

const meta: Meta<typeof TestComponent> = {
  title: 'Test/Simple',
  component: TestComponent,
}

export default meta
type Story = StoryObj<typeof TestComponent>

export const Default: Story = {}
