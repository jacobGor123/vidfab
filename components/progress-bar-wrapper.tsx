"use client"

import { AppProgressBar } from 'next-nprogress-bar'

export function ProgressBarWrapper() {
  return (
    <AppProgressBar
      height="3px"
      color="#7c3aed"
      options={{ showSpinner: false }}
      shallowRouting
    />
  )
}
