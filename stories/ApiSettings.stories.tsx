import type { Meta, StoryObj } from '@storybook/react'
import { ApiSettings } from '@/components/cascade/ApiSettings'

const meta: Meta<typeof ApiSettings> = {
  title: 'Components/ApiSettings',
  component: ApiSettings,
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
