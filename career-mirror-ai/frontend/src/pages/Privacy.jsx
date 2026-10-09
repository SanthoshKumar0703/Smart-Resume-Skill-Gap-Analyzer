import { ArrowLeft, Download } from 'lucide-react'
import ThemeSwitch from '../components/ThemeSwitch'
import { BrandMark } from '../components/Logo'
import { downloadTextFile } from '../utils/helpers'
import { useToast } from '../context/ToastContext'

const PRIVACY_TEXT = `CAREER MIRROR AI — PRIVACY POLICY
Last updated: August 2026

1. Introduction
Career Mirror AI ("we", "our", "the Service") is a resume skill-gap analysis platform.
This Privacy Policy explains what information we collect, how we use it, and the choices
you have. By creating an account or using the Service you agree to this policy.

2. Information We Collect
- Account information: your name, email address, and a securely hashed password
  (bcrypt). Passwords are never stored in plain text.
- Profile information: resume documents you upload (PDF/DOCX), job descriptions,
  extracted skills, analyses, learning progress, and notifications.
- Usage information: analysis history, AI assistant conversations and aggregate
  platform metrics.

3. How We Use Your Information
- To provide the resume analysis, skill matching, roadmap and progress features.
- To personalize recommendations and the AI assistant's answers.
- To operate, secure and improve the Service.
- To contact you about your account (e.g. password reset emails).

4. How We Store Your Data
Data is stored in MongoDB collections on the infrastructure you deploy the Service on.
When run locally (the default), all data stays on your own machine or network.
We apply role-based access control and JWT authentication to protect your data.

5. Local AI Processing
Career Mirror AI performs parsing, skill extraction and semantic matching with local,
open-source models (spaCy, Sentence Transformers) that run on your own infrastructure.
No resume content is sent to third-party AI providers unless you explicitly configure
and enable an external provider.

6. Sharing of Information
We do not sell your personal data. We share data only:
- with service providers that host the infrastructure you deploy on;
- when required by law;
- with your explicit consent.

7. Your Rights
Depending on your jurisdiction you may have the right to access, correct, export or
delete your personal data. You can delete your analyses, resumes and account from the
dashboard, or contact us at hello@careermirror.ai.

8. Cookies & Local Storage
We use browser local storage solely to persist your login session and theme preference
on your device.

9. Children's Privacy
The Service is not directed to individuals under the age of 16.

10. Data Retention
Account data is retained while your account is active. You may delete your account at
any time; we delete your personal data within 30 days unless retention is required by law.

11. Security
We use bcrypt password hashing, JWT tokens with expiry, role-based authorization,
input validation, file type and size limits, and environment-variable secrets. No
secrets are exposed to the browser.

12. Changes to This Policy
We may update this policy from time to time. Material changes will be communicated
through the Service. Continued use after changes constitutes acceptance.

13. Contact
Questions: hello@careermirror.ai
`

export default function Privacy() {
  const toast = useToast()
  return (
    <div>
      <header className="landing-header" style={{ position: 'sticky', height: 'var(--header-h)' }}>
        <a href="/" className="brand" aria-label="Career Mirror AI - home">
          <BrandMark size={38} />
          <span className="brand-text">
            <b>Career Mirror AI</b>
            <span>Smart Resume Skill Gap Analyzer</span>
          </span>
        </a>
        <div className="topbar-spacer" />
        <ThemeSwitch />
      </header>

      <div className="legal-shell">
        <div className="legal-toolbar">
          <a href="/" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
            <ArrowLeft size={16} /> Back to home
          </a>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              downloadTextFile('career-mirror-ai-privacy-policy.txt', PRIVACY_TEXT, 'text/plain')
              toast.success('Download started', 'Privacy policy saved as a text document.')
            }}
          >
            <Download size={15} /> Download policy
          </button>
        </div>

        <article className="legal-doc">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: August 2026 · Career Mirror AI</p>

          <h2>1. Introduction</h2>
          <p>
            Career Mirror AI ("we", "our", "the Service") is a smart resume skill-gap
            analyzer. This Privacy Policy explains what information we collect, how we
            use it, and the choices you have. By creating an account or using the
            Service, you agree to this policy.
          </p>

          <h2>2. Information We Collect</h2>
          <ul>
            <li><b>Account information</b> — your name, email address and a securely hashed password (bcrypt). Passwords are never stored in plain text.</li>
            <li><b>Profile information</b> — resumes you upload (PDF/DOCX), job descriptions, extracted skills, analyses, learning progress and notifications.</li>
            <li><b>Usage information</b> — analysis history, AI assistant conversations and aggregate platform metrics.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide resume parsing, skill matching, roadmap and progress features.</li>
            <li>To personalize recommendations and the AI assistant's answers.</li>
            <li>To operate, secure and improve the Service.</li>
            <li>To contact you about your account (e.g. password reset emails).</li>
          </ul>

          <h2>4. How We Store Your Data</h2>
          <p>
            Data is stored in MongoDB collections on the infrastructure where you deploy
            the Service. When run locally (the default), all data stays on your own
            machine or network. We apply role-based access control and JWT authentication
            to protect your data.
          </p>

          <h2>5. Local AI Processing</h2>
          <p>
            Career Mirror AI performs parsing, skill extraction and semantic matching
            with local, open-source models (spaCy, Sentence Transformers) that run on
            your own infrastructure. No resume content is sent to third-party AI
            providers unless you explicitly configure and enable an external provider.
          </p>

          <h2>6. Sharing of Information</h2>
          <p>We do not sell your personal data. We share data only:</p>
          <ul>
            <li>with service providers that host the infrastructure you deploy on;</li>
            <li>when required by law;</li>
            <li>with your explicit consent.</li>
          </ul>

          <h2>7. Your Rights</h2>
          <p>
            Depending on your jurisdiction you may have the right to access, correct,
            export or delete your personal data. You can delete your analyses, resumes
            and account from the dashboard, or contact us at hello@careermirror.ai.
          </p>

          <h2>8. Cookies &amp; Local Storage</h2>
          <p>
            We use browser local storage solely to persist your login session and theme
            preference on your device.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>The Service is not directed to individuals under the age of 16.</p>

          <h2>10. Data Retention</h2>
          <p>
            Account data is retained while your account is active. You may delete your
            account at any time; we delete your personal data within 30 days unless
            retention is required by law.
          </p>

          <h2>11. Security</h2>
          <p>
            We use bcrypt password hashing, JWT tokens with expiry, role-based
            authorization, input validation, file type and size limits, and
            environment-variable secrets. No secrets are exposed to the browser.
          </p>

          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be
            communicated through the Service. Continued use after changes constitutes
            acceptance.
          </p>

          <h2>13. Contact</h2>
          <p>Questions about this policy: <b>hello@careermirror.ai</b></p>
        </article>
      </div>
    </div>
  )
}
