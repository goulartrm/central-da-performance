import * as React from 'react'

// Height threshold to distinguish phones from tablets in landscape mode
// Phones in landscape typically have < 600px height
const LANDSCAPE_MOBILE_HEIGHT = 600

export function useIsLandscapeMobile() {
  const [isLandscapeMobile, setIsLandscapeMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkLandscape = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches
      const isSmallHeight = window.innerHeight < LANDSCAPE_MOBILE_HEIGHT
      return isLandscape && isSmallHeight
    }

    const mql = window.matchMedia('(orientation: landscape)')
    const onChange = () => {
      setIsLandscapeMobile(checkLandscape())
    }

    mql.addEventListener('change', onChange)
    setIsLandscapeMobile(checkLandscape())

    // Also listen to resize events for height changes
    window.addEventListener('resize', onChange)

    return () => {
      mql.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  return !!isLandscapeMobile
}
