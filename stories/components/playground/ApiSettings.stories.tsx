import type { Meta, StoryObj } from '@storybook/react'
import { ApiSettings } from '@/components/playground/ApiSettings'

const meta: Meta<typeof ApiSettings> = {
  title: 'Playground/ApiSettings',
  component: ApiSettings,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ApiSettings>

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Modal closed'),
  },
}

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
}

export const OpenWithInstructions: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  play: async () => {
    // Modal will show instructions about configuring API credentials
  },
}
