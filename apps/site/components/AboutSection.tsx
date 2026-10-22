import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../lib/constants"

const CONTACT_EMAIL = "prasanthkuna@gmail.com"
const X_URL = "https://x.com/prasanth_kuna"
const LINKEDIN_URL = "https://www.linkedin.com/in/prasanth-kuna-1463631b3"

export function AboutSection() {
  return (
    <section className="section" id="about">
      <h2>About</h2>
      <p className="section-intro">
        Railguard is an open-source personal project, built by Prasanth Kuna, payments &amp; backend
        engineer.
      </p>
      <p className="section-intro">
        Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <p className="foss-links">
        <a href={GITHUB_GATEWAY} {...EXTERNAL_LINK}>
          GitHub
        </a>{" "}
        ·{" "}
        <a href={X_URL} {...EXTERNAL_LINK}>
          X
        </a>{" "}
        ·{" "}
        <a href={LINKEDIN_URL} {...EXTERNAL_LINK}>
          LinkedIn
        </a>
      </p>
    </section>
  )
}
