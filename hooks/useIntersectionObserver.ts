"use client"

import { useRef, useEffect, useState, useCallback } from 'react'

interface UseIntersectionObserverOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  freezeOnceVisible?: boolean
  initialIsIntersecting?: boolean
  enabled?: boolean
}

interface UseIntersectionObserverReturn {
  ref: React.RefObject<Element>
  isIntersecting: boolean
  entry?: IntersectionObserverEntry
}

export function useIntersectionObserver({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  freezeOnceVisible = false,
  initialIsIntersecting = false,
  enabled = true
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const ref = useRef<Element>(null)
  const [entry, setEntry] = useState<IntersectionObserverEntry>()
  const [isIntersecting, setIsIntersecting] = useState(initialIsIntersecting)

  const frozen = freezeOnceVisible && isIntersecting

  useEffect(() => {
    const node = ref.current
    const hasIOSupport = !!window.IntersectionObserver

    if (!hasIOSupport || frozen || !node || !enabled) {
      return
    }

    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry)
        setIsIntersecting(entry.isIntersecting)
      },
      observerParams
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [threshold, root, rootMargin, frozen, enabled])

  const prevEntry = entry
  return {
    ref,
    isIntersecting,
    entry: prevEntry
  }
}

// 高性能批量 Intersection Observer Hook
interface UseBatchIntersectionObserverOptions {
  elements: React.RefObject<Element>[]
  options?: IntersectionObserverOptions
  onIntersect?: (entries: IntersectionObserverEntry[]) => void
}

export function useBatchIntersectionObserver({
  elements,
  options = {},
  onIntersect
}: UseBatchIntersectionObserverOptions) {
  const [intersectingElements, setIntersectingElements] = useState<Set<Element>>(new Set())
  const observerRef = useRef<IntersectionObserver>()

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    setIntersectingElements(prev => {
      const newSet = new Set(prev)
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          newSet.add(entry.target)
        } else {
          newSet.delete(entry.target)
        }
      })
      return newSet
    })

    onIntersect?.(entries)
  }, [onIntersect])

  useEffect(() => {
    if (!window.IntersectionObserver) return

    // 创建观察器
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    })

    const observer = observerRef.current

    // 观察所有元素
    elements.forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [elements, options, handleIntersection])

  return {
    intersectingElements,
    isElementIntersecting: (element: Element) => intersectingElements.has(element)
  }
}

// 智能预加载Hook - 根据滚动方向和速度决定预加载策略
interface UseSmartPreloadOptions {
  preloadDistance?: number
  scrollSpeedThreshold?: number
  maxPreloadItems?: number
}

export function useSmartPreload({
  preloadDistance = 200,
  scrollSpeedThreshold = 100,
  maxPreloadItems = 5
}: UseSmartPreloadOptions = {}) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [scrollSpeed, setScrollSpeed] = useState(0)
  const [shouldPreload, setShouldPreload] = useState(true)

  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(Date.now())

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const currentTime = Date.now()

      const deltaY = currentScrollY - lastScrollY.current
      const deltaTime = currentTime - lastScrollTime.current

      // 计算滚动方向
      if (deltaY > 0) {
        setScrollDirection('down')
      } else if (deltaY < 0) {
        setScrollDirection('up')
      }

      // 计算滚动速度 (pixels per millisecond)
      const speed = Math.abs(deltaY) / deltaTime
      setScrollSpeed(speed)

      // 如果滚动速度太快，暂停预加载以节省带宽
      setShouldPreload(speed < scrollSpeedThreshold)

      lastScrollY.current = currentScrollY
      lastScrollTime.current = currentTime
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollSpeedThreshold])

  const getPreloadMargin = useCallback(() => {
    if (!shouldPreload) return '0px'

    // 根据滚动方向调整预加载边距
    if (scrollDirection === 'down') {
      return `0px 0px ${preloadDistance}px 0px`
    } else if (scrollDirection === 'up') {
      return `${preloadDistance}px 0px 0px 0px`
    }

    return `${preloadDistance}px`
  }, [scrollDirection, preloadDistance, shouldPreload])

  return {
    scrollDirection,
    scrollSpeed,
    shouldPreload,
    preloadMargin: getPreloadMargin()
  }
}

// 视口内可见元素管理Hook
export function useVisibleElements() {
  const [visibleElements, setVisibleElements] = useState<Map<string, Element>>(new Map())
  const observerRef = useRef<IntersectionObserver>()

  const observe = useCallback((element: Element, id: string) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          setVisibleElements(prev => {
            const newMap = new Map(prev)
            entries.forEach(entry => {
              const elementId = entry.target.getAttribute('data-video-id')
              if (elementId) {
                if (entry.isIntersecting) {
                  newMap.set(elementId, entry.target)
                } else {
                  newMap.delete(elementId)
                }
              }
            })
            return newMap
          })
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: 0.5 // 元素50%可见时才算真正可见
        }
      )
    }

    element.setAttribute('data-video-id', id)
    observerRef.current.observe(element)
  }, [])

  const unobserve = useCallback((element: Element) => {
    observerRef.current?.unobserve(element)
  }, [])

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect()
    setVisibleElements(new Map())
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    visibleElements,
    observe,
    unobserve,
    cleanup,
    visibleCount: visibleElements.size
  }
}