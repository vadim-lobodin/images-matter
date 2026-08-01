'use client'

import { useEffect, useRef } from 'react'

interface BlobImageProps {
  blob: Blob
  alt: string
  className?: string
}

export function BlobImage({ blob, alt, className }: BlobImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current
    if (!image) return

    const url = URL.createObjectURL(blob)
    image.hidden = false
    image.src = url

    return () => {
      if (image.getAttribute('src') === url) image.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [blob])

  return (
    // Blob URLs are already local and cannot be optimized by next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  )
}
