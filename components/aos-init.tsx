"use client"

import { useEffect } from "react"
import AOS from "aos"

export function AOSInit() {
  useEffect(() => {
    AOS.init({
      duration: 800, // Default animation duration
      easing: "ease-out-cubic", // Default easing for AOS animations
      once: true, // Whether animation should happen only once - while scrolling down
      mirror: false, // Whether elements should animate out while scrolling past them
      anchorPlacement: "top-bottom", // Defines which position of the element regarding to window should trigger the animation
      disable: false, // Accepts following values: 'phone', 'tablet', 'mobile', boolean, expression or function
      offset: 100, // Offset (in px) from the original trigger point
      delay: 0, // Values from 0 to 3000, with step 50ms
    })
  }, [])

  return null
}