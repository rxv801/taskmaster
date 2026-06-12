/**
 * Browser activity onboarding step.
 *
 * This screen lets the user decide which common websites should be treated as
 * allowed or blocked during focus sessions.
 *
 * It does not detect websites yet. Later, Taskmaster can compare the active
 * browser window title against the matchText values stored in the settings.
 */

import { useFocusEnvironmentSettings } from '../../hooks/useFocusEnvironmentSettings'
import type {
  BrowserActivityRule,
  BrowserActivityRuleStatus,
} from '../../hooks/useFocusEnvironmentSettings'


type BrowserActivitySelectionStepProps = {
  onBack: () => void
  onContinue: () => void
}

type BrowserActivityRuleSectionProps = {
  title: string
  description: string
  rules: BrowserActivityRule[]
  onUpdateRuleStatus: (
    ruleId: string,
    status: BrowserActivityRuleStatus
  ) => void
}





/**
 * Renders browser activity rules from useFocusEnvironmentSettings.
 *
 * The settings hook owns the data and update logic. This component only renders
 * the onboarding UI and forwards toggle changes back to the hook.
 */

function BrowserActivityRuleSection({
  title,
  description,
  rules,
  onUpdateRuleStatus,
}: BrowserActivityRuleSectionProps) {

  return (
    <div className="focus-app-rule-section">
      <div className="focus-app-rule-section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="focus-app-rule-list">
        {rules.map((rule) => {
          const isBlocked = rule.status === 'blocked'

          return (
            <div className="focus-app-rule-row" key={rule.id}>
              <div className="browser-activity-rule-copy">
                <span className="focus-app-rule-name">{rule.label}</span>
                <span className="browser-activity-rule-description">
                  {rule.description}
                </span>
              </div>

              <label
                className={`focus-app-toggle ${
                  isBlocked ? 'focus-app-toggle--blocked' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(event) =>
                    onUpdateRuleStatus(
                      rule.id,
                      event.target.checked ? 'blocked' : 'allowed'
                    )
                  }
                  aria-label={`${isBlocked ? 'Allow' : 'Block'} ${rule.label}`}
                />
                <span aria-hidden="true" />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Onboarding step for configuring common browser page rules.
 *
 * For now, this is only static UI state. In the next step, these rules should
 * be moved into useFocusEnvironmentSettings so Back/Continue can save them to
 * localStorage together with the desktop app rules.
 */
export default function BrowserActivitySelectionStep({
  onBack,
  onContinue,
}: BrowserActivitySelectionStepProps) {
    const {
    blockedBrowserActivityRules,
    flexibleBrowserActivityRules,
    updateBrowserActivityRuleStatus,
    saveFocusEnvironmentSettings,
    } = useFocusEnvironmentSettings()

    function handleBack() {
        saveFocusEnvironmentSettings()
        onBack()
    }

    function handleContinue() {
        saveFocusEnvironmentSettings()
        onContinue()
    }
    return (
        <section className="onboarding-screen focus-environment-screen">
        <p className="status-pill onboarding-step-pill">Step 4</p>

        <div className="focus-environment-layout">
            <header className="focus-environment-header">
            <div className="onboarding-header">
                <h1 className="onboarding-title focus-environment-title">
                Browser activity
                </h1>
                <p className="onboarding-subtitle">
                Choose which websites should count as distractions during focus
                sessions.
                </p>
            </div>

            <p className="focus-environment-explainer muted-text">
                For the MVP, Taskmaster will estimate browser activity from the
                active window title, such as “YouTube - Google Chrome”.
            </p>
            </header>

            <section className="allowed-environment-panel surface-card">
            <div className="focus-learning-note">
                <p>
                These websites do not need to be installed. They are common page
                patterns that Taskmaster can later match while your browser is
                open.
                </p>
            </div>

            <div className="browser-activity-rules" aria-label="Browser activity focus rules">
                <BrowserActivityRuleSection
                title="Potential distractions"
                description="Websites that are usually distracting during deep work."
                rules={blockedBrowserActivityRules}
                onUpdateRuleStatus={updateBrowserActivityRuleStatus}
                />

                <BrowserActivityRuleSection
                title="Flexible tools"
                description="Websites that can be productive or distracting depending on the task."
                rules={flexibleBrowserActivityRules}
                onUpdateRuleStatus={updateBrowserActivityRuleStatus}
                />
            </div>
            </section>

            <div className="onboarding-actions onboarding-fixed-actions">
            <button className="secondary-button" type="button" onClick={handleBack}>
                Back
            </button>

            <button className="primary-button" type="button" onClick={handleContinue}>
                Continue
            </button>
            </div>
        </div>
        </section>
    )
}