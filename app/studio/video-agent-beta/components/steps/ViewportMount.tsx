/**
 * ViewportMount
 * 进入视口后才挂载重组件（如 <video>），避免同屏大量媒体元素拖慢主线程。
 */

'use client'

import { useEffect, useRef, useState } from 'react'

interface ViewportMountProps {
  children: React.ReactNode
  placeholder?: React.ReactNode
  rootMargin?: string
  className?: string
}

export default function ViewportMount({
  children,
  placeholder,
  rootMargin = '300px 0px',
  className
}: ViewportMountProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    if (isInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setIsInView(true)
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isInView, rootMargin])

  return (
    <div ref={hostRef} className={className}>
      {isInView ? children : placeholder ?? null}
    </div>
  )
}
