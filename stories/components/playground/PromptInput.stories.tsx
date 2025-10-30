import type { Meta, StoryObj } from '@storybook/react'
import { PromptInput } from '@/components/playground/PromptInput'

const meta: Meta<typeof PromptInput> = {
  title: 'Playground/PromptInput',
  component: PromptInput,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    maxLength: { control: 'number' },
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

export const EditMode: Story = {
  args: {
    value: '',
    onChange: (value: string) => console.log('Prompt changed:', value),
    placeholder: 'Describe how to edit the selected images...',
    maxLength: 4000,
  },
}

export const LongPrompt: Story = {
  args: {
    value: 'Create a highly detailed digital painting of a futuristic city at night, with neon lights reflecting off wet streets, flying vehicles in the sky, and towering skyscrapers with holographic advertisements. The scene should have a cyberpunk aesthetic with a mix of warm and cool lighting, rain falling gently, and crowds of people walking under umbrellas.',
    onChange: (value: string) => console.log('Prompt changed:', value),
    placeholder: 'Describe the image you want to generate...',
    maxLength: 4000,
  },
}
