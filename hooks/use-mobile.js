import * as React from "react"

/**
 * The width below which the sidebar stops being docked furniture and becomes an
 * overlay sheet. Raised from 768 to 1024 for tablets: at 768px a docked 16rem
 * sidebar takes 256px of 768 — a third of the screen — and left 512px for
 * tables that want 900. A portrait tablet now gets the full width for content
 * and reaches navigation through the top-bar trigger, exactly like a phone.
 *
 * `ui/sidebar.jsx` is the only consumer, and its own `lg:` classes are the CSS
 * half of this same threshold — the two must be changed together or the sheet
 * and the docked rail are both visible at once.
 */
const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
