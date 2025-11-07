"use client"

import {
  CheckmarkFilled,
  Information,
  WarningAlt,
  ErrorFilled,
  Renew,
} from "@carbon/icons-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckmarkFilled className="size-4" />,
        info: <Information className="size-4" />,
        warning: <WarningAlt className="size-4" />,
        error: <ErrorFilled className="size-4" />,
        loading: <Renew className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
