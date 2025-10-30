import type { Meta, StoryObj } from '@storybook/react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-8 bg-background border border-border rounded-lg">
      <p className="text-sm text-muted-foreground">Click to toggle theme:</p>
      <ThemeToggle />
    </div>
  ),
}

export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2 p-4 bg-background border border-border rounded-lg">
      <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Action 1">
        <div className="w-5 h-5 bg-muted rounded" />
      </button>
      <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Action 2">
        <div className="w-5 h-5 bg-muted rounded" />
      </button>
      <ThemeToggle />
      <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Action 3">
        <div className="w-5 h-5 bg-muted rounded" />
      </button>
    </div>
  ),
}
