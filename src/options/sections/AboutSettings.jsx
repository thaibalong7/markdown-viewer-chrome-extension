import React from 'react'
import { AppIcon } from '../../shared/react/AppIcon.jsx'
import { Badge } from '../../shared/react/Badge.jsx'
import { Notice } from '../../shared/react/Notice.jsx'
import { ABOUT_LINKS, getExtensionMetadata } from '../about-metadata.js'

const FEATURES = Object.freeze([
  Object.freeze({
    title: 'Read',
    description: 'Render local Markdown, code, math, diagrams, text, and images.'
  }),
  Object.freeze({
    title: 'Explore',
    description: 'Browse sibling documents or open a local workspace.'
  }),
  Object.freeze({
    title: 'Edit',
    description: 'Opt in to editing with exact-file verification and safe saves.'
  })
])

export function AboutSettings({ metadata = getExtensionMetadata() }) {
  const platformLabels = [metadata.manifestLabel, metadata.minimumChromeLabel, 'Open source']
    .filter(Boolean)

  return (
    <section className="settings-section settings-section--about" aria-labelledby="about-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Product</p>
        <h2 id="about-title">About Markdown Plus</h2>
        <p>Learn what Markdown Plus does, how it handles your files, and where to get help.</p>
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
            <h3>Markdown Plus</h3>
            <Badge variant="info">Version {metadata.version}</Badge>
          </div>
          <p>A local-first viewer and editor for Markdown and related files.</p>
          <ul className="settings-about-hero__meta" aria-label="Extension information">
            {platformLabels.map((label) => <li key={label}>{label}</li>)}
          </ul>
        </div>
      </div>

      <Notice variant="success" title="Local-first by design" className="settings-about-privacy">
        <p>
          Your documents are processed in Chrome and are not sent to a developer-operated
          service. Device-local data stays on this device; preferences may sync through Chrome.
        </p>
        <a href={ABOUT_LINKS.find(({ id }) => id === 'privacy').href} target="_blank" rel="noreferrer">
          Read the privacy policy
          <AppIcon name="external" />
        </a>
      </Notice>

      <div className="settings-about-block" aria-labelledby="about-features-title">
        <h3 id="about-features-title">What Markdown Plus does</h3>
        <div className="settings-about-features">
          {FEATURES.map((feature) => (
            <article className="mdp-ui-card settings-about-feature" key={feature.title}>
              <strong>{feature.title}</strong>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="settings-about-block" aria-labelledby="about-links-title">
        <h3 id="about-links-title">Project &amp; support</h3>
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
                <strong>{link.label}</strong>
                <small>{link.description}</small>
              </span>
              <AppIcon name="external" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
