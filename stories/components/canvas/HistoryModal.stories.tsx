import type { Meta, StoryObj } from '@storybook/react'
import { HistoryModal } from '@/components/canvas/HistoryModal'

const meta: Meta<typeof HistoryModal> = {
  title: 'Canvas/HistoryModal',
  component: HistoryModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isOpen: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof HistoryModal>

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Modal closed'),
    onSelectImages: (images: string[]) => console.log('Selected images:', images),
  },
}

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onSelectImages: (images: string[]) => console.log('Selected images:', images),
  },
}

export const OpenEmpty: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    onSelectImages: (images: string[]) => console.log('Selected images:', images),
  },
  parameters: {
    docs: {
      description: {
        story: 'History modal when IndexedDB is empty (no previous generations)',
      },
    },
  },
}
