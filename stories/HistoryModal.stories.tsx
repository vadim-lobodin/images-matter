import type { Meta, StoryObj } from '@storybook/react'
import { HistoryModal } from '@/components/canvas/HistoryModal'

const meta: Meta<typeof HistoryModal> = {
  title: 'Components/HistoryModal',
  component: HistoryModal,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof HistoryModal>

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Drawer closed'),
    onSelectImages: (images: string[]) => console.log('Selected images:', images),
  },
}

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Drawer closed'),
    onSelectImages: (images: string[]) => console.log('Selected images:', images),
  },
}
