// Temporary post-onboarding entry point.
// For now, the menu route sends the user straight into the Deep Sesh UI.

import DeepSeshPage from './DeepSeshPage'

type MenuPageProps = {
  onOpenOnboardingStep: (step: number) => void
}

export default function MenuPage({ onOpenOnboardingStep }: MenuPageProps) {
  return <DeepSeshPage onOpenOnboardingStep={onOpenOnboardingStep} />
}
