import type { Meta, StoryObj } from '@storybook/react'
import { PromptInput } from '@/components/cascade/PromptInput'

const meta: Meta<typeof PromptInput> = {
  title: 'Components/PromptInput',
  component: PromptInput,
  parameters: {
    docs: {
      description: {
        component: 'A textarea input component for entering prompts with keyboard shortcuts:\n- **Enter**: Submit the prompt (calls `onSubmit`)\n- **Shift+Enter**: Insert a line break\n- **Arrow Up/Down**: Navigate through prompt history (handled by parent component)',
      },
    },
  },
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

export const WithSubmit: Story = {
  args: {
    value: '',
    onChange: (value: string) => console.log('Prompt changed:', value),
    onSubmit: () => {
      alert('Prompt submitted! Press Enter to submit, Shift+Enter for line breaks.')
    },
    placeholder: 'Type a prompt and press Enter to submit...',
    maxLength: 4000,
  },
}
