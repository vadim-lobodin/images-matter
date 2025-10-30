import type { Preview } from '@storybook/nextjs-vite'
import '../app/globals.css'
import React from 'react'
import { ThemeProvider } from '../components/providers/theme-provider'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;