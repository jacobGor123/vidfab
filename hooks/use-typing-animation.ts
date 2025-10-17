"use client"

import { useState, useEffect, useRef, useCallback } from "react"

type AnimationPhase = "typing" | "pausing" | "deleting"

interface UseTypingAnimationProps {
  questions: string[]
  typingSpeed?: number
  deleteSpeed?: number
  pauseDuration?: number
}

interface UseTypingAnimationReturn {
  animatedPlaceholder: string
  isAnimating: boolean
  onFocus: () => void
  onBlur: (currentInputValue: string) => void
}

export function useTypingAnimation({
  questions,
  typingSpeed = 70, // average ms per char
  deleteSpeed = 40, // average ms per char
  pauseDuration = 1500, // ms
}: UseTypingAnimationProps): UseTypingAnimationReturn {
  const [currentText, setCurrentText] = useState<string>("")
  const [questionIndex, setQuestionIndex] = useState<number>(0)
  const [phase, setPhase] = useState<AnimationPhase>("typing")
  const [isManuallyFocused, setIsManuallyFocused] = useState<boolean>(false)

  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  useEffect(() => {
    clearAllTimeouts()
    if (isManuallyFocused || !questions || questions.length === 0) {
      return
    }

    const currentQuestion = questions[questionIndex]

    let timeoutId: NodeJS.Timeout

    if (phase === "typing") {
      if (currentText.length < currentQuestion.length) {
        timeoutId = setTimeout(
          () => {
            setCurrentText(currentQuestion.slice(0, currentText.length + 1))
          },
          typingSpeed + (Math.random() - 0.5) * (typingSpeed * 0.4),
        )
        timeoutsRef.current.push(timeoutId)
      } else {
        timeoutId = setTimeout(() => setPhase("pausing"), 50) // Short delay before pause starts
        timeoutsRef.current.push(timeoutId)
      }
    } else if (phase === "pausing") {
      timeoutId = setTimeout(() => {
        setPhase("deleting")
      }, pauseDuration)
      timeoutsRef.current.push(timeoutId)
    } else if (phase === "deleting") {
      if (currentText.length > 0) {
        timeoutId = setTimeout(
          () => {
            setCurrentText(currentText.slice(0, -1))
          },
          deleteSpeed + (Math.random() - 0.5) * (deleteSpeed * 0.4),
        )
        timeoutsRef.current.push(timeoutId)
      } else {
        timeoutId = setTimeout(() => {
          setQuestionIndex((prevIndex) => (prevIndex + 1) % questions.length)
          setPhase("typing")
        }, 50) // Short delay before typing next
        timeoutsRef.current.push(timeoutId)
      }
    }

    return clearAllTimeouts
  }, [
    currentText,
    phase,
    questionIndex,
    questions,
    isManuallyFocused,
    typingSpeed,
    deleteSpeed,
    pauseDuration,
    clearAllTimeouts,
  ])

  const handleFocus = useCallback(() => {
    setIsManuallyFocused(true)
    clearAllTimeouts()
    // Static placeholder text is now handled by animatedPlaceholder logic
  }, [clearAllTimeouts])

  const handleBlur = useCallback((currentInputValue: string) => {
    if (currentInputValue === "") {
      setIsManuallyFocused(false)
      // Reset to start deleting any residual static text or start fresh if currentText was already cleared
      setCurrentText("") // Clear current text to ensure clean start for animation
      setPhase("typing") // Restart animation cycle
    }
  }, [])

  return {
    animatedPlaceholder: isManuallyFocused ? "Ask a research question..." : currentText,
    isAnimating: !isManuallyFocused,
    onFocus: handleFocus,
    onBlur: handleBlur,
  }
}
