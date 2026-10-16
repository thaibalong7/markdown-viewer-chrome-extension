import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { AppIcon } from '../../shared/react/AppIcon.jsx'
import { Badge } from '../../shared/react/Badge.jsx'
import { Notice } from '../../shared/react/Notice.jsx'
import { ABOUT_LINKS, getExtensionMetadata } from '../about-metadata.js'

const FEATURES = Object.freeze([
  Object.freeze({
    title: 'common.actions.read',
    description: 'options.about.renderLocalMarkdownCodeMathDiagramsTextAnd'
  }),
  Object.freeze({
    title: 'common.actions.explore',
    description: 'options.about.browseSiblingDocumentsOrOpenALocalWorkspace'
  }),
  Object.freeze({
    title: 'common.actions.edit',
    description: 'options.about.optInToEditingWithExactFileVerification'
  })
])

export function AboutSettings({ metadata = getExtensionMetadata() }) {
  useLocale()
  const platformLabels = [metadata.manifestLabel, metadata.minimumChromeLabel, 'options.about.openSource']
    .filter(Boolean)

  return (
    <section className="settings-section settings-section--about" aria-labelledby="about-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">{t('options.about.product')}</p>
        <h2 id="about-title">{t('options.about.heading')}</h2>
        <p>{t('options.about.learnWhatMarkdownPlusDoesHowItHandles')}</p>
      </div>

      <div className="mdp-ui-card settings-about-hero">
        <img
          className="settings-about-hero__mark"
          src="/icons/icon-128.png"
          width="72"
          height="72"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <div className="settings-about-hero__copy">
          <div className="settings-about-hero__title-row">
            <h3>{t('common.productName')}</h3>
            <Badge variant="info">{t('options.about.version')}{' '}{t(metadata.version)}</Badge>
          </div>
          <p>{t('options.about.aLocalFirstViewerAndEditorForMarkdown')}</p>
          <ul className="settings-about-hero__meta" aria-label={t('options.about.extensionInformation')}>
            {platformLabels.map((label) => <li key={label.messageKey || label}>{t(label)}</li>)}
          </ul>
        </div>
      </div>

      <Notice variant="success" title={t('options.about.localFirstByDesign')} className="settings-about-privacy">
        <p>{t('options.about.yourDocumentsAreProcessedInChromeAndAre')}</p>
        <a href={ABOUT_LINKS.find(({ id }) => id === 'privacy').href} target="_blank" rel="noreferrer">{t('options.about.readThePrivacyPolicy')}<AppIcon name="external" />
        </a>
      </Notice>

      <div className="settings-about-block" aria-labelledby="about-features-title">
        <h3 id="about-features-title">{t('options.about.whatMarkdownPlusDoes')}</h3>
        <div className="settings-about-features">
          {FEATURES.map((feature) => (
            <article className="mdp-ui-card settings-about-feature" key={feature.title}>
              <strong>{t(feature.title)}</strong>
              <p>{t(feature.description)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="settings-about-block" aria-labelledby="about-links-title">
        <h3 id="about-links-title">{t('options.about.projectSupport')}</h3>
        <div className="mdp-ui-card settings-about-links">
          {ABOUT_LINKS.map((link) => (
            <a
              className="settings-about-link"
              href={link.href}
              target="_blank"
              rel="noreferrer"
              key={link.id}
            >
              <span>
                <strong>{t(link.label)}</strong>
                <small>{t(link.description)}</small>
              </span>
              <AppIcon name="external" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
