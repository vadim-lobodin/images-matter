import type { Meta, StoryObj } from '@storybook/react'
import { PromptInput } from '@/components/cascade/PromptInput'

const meta: Meta<typeof PromptInput> = {
  title: 'Components/PromptInput',
  component: PromptInput,
}

export default meta
type Story = StoryObj<typeof PromptInput>

export const Default: Story = {
  args: {
    value: '',
    onChange: (value: string) => console.log('Prompt changed:', value),
    placeholder: 'Describe the image you want to generate...',
    maxLength: 4000,
  },
}

export const WithValue: Story = {
  args: {
    value: 'A beautiful landscape with mountains and a lake at sunset',
    onChange: (value: string) => console.log('Prompt changed:', value),
    placeholder: 'Describe the image you want to generate...',
    maxLength: 4000,
  },
}
