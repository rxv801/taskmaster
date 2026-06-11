/**
 * Main onboarding flow controller.
 *
 * This page owns the current onboarding step, transition direction, and screen
 * animations. Individual onboarding screens should keep their own UI focused
 * and receive only navigation callbacks from this page.
 */
import { useEffect, useRef, useState } from 'react'
import CameraSetupStep from '../components/onboarding/OnboardingCameraSetup'
import DistractionOptionsStep from '../components/onboarding/OnboardingAdditionalFunctions'
import FocusEnvironmentStep from '../components/onboarding/WhitelistSelectionStep'
import MenuPage from './MenuPage'
import WelcomeStep from '../components/onboarding/OnboardingWelcome'
import BrowserActivitySelectionStep from '../components/onboarding/BrowserActivitySelectionStep'

type Direction = 'forward' | 'backward'

const lightStateByStep = [
  'hero',
  'top-right',
  'top-left',
  'ambient',
  'ambient',
  'off',
] as const

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [previousStep, setPreviousStep] = useState<number | null>(null)
  const [direction, setDirection] = useState<Direction>('forward')
  const transitionTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current)
      }
    }
  }, [])

  function goToStep(nextStep: number) {
    if (nextStep === step) {
      return
    }

    setDirection(nextStep > step ? 'forward' : 'backward')
    setPreviousStep(step)
    setStep(nextStep)

    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current)
    }

    transitionTimer.current = window.setTimeout(() => {
      setPreviousStep(null)
      transitionTimer.current = null
    }, 700)
  }

  
  function renderStep(stepToRender: number) {
    if (stepToRender === 0) {
      return <WelcomeStep onStartSetup={() => goToStep(1)} />
    }

    if (stepToRender === 1) {
      return (
        <CameraSetupStep
          onBack={() => goToStep(0)}
          onContinue={() => goToStep(2)}
        />
      )
    }

    if (stepToRender === 2) {
      return (
        <FocusEnvironmentStep
          onBack={() => goToStep(1)}
          onContinue={() => goToStep(3)}
        />
      )
    }

    if (stepToRender === 3) {
      return (
        <BrowserActivitySelectionStep
          onBack={() => goToStep(2)}
          onContinue={() => goToStep(4)}
        />
      )
    }

    if (stepToRender === 4) {
      return (
        <DistractionOptionsStep
          onBack={() => goToStep(3)}
          onFinish={() => goToStep(5)}
        />
      )
    }

    return <MenuPage />
  }

  const lightState = lightStateByStep[step] ?? 'off'

  return (
    <div className="onboarding-flow">
      <div
        className={`onboarding-light onboarding-light--${lightState}`}
        aria-hidden="true"
      />

      {previousStep !== null && (
        <div
          className={`onboarding-step onboarding-step--exit onboarding-step--exit-${direction}`}
          key={`exit-${previousStep}`}
        >
          {renderStep(previousStep)}
        </div>
      )}

      <div
        className={`onboarding-step onboarding-step--enter onboarding-step--enter-${direction}`}
        key={`enter-${step}`}
      >
        {renderStep(step)}
      </div>
    </div>
  )
}
