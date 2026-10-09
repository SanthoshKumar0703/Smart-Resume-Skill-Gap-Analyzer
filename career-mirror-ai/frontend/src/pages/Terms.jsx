import { ArrowLeft, Download } from 'lucide-react'
import ThemeSwitch from '../components/ThemeSwitch'
import { BrandMark } from '../components/Logo'
import { downloadTextFile } from '../utils/helpers'
import { useToast } from '../context/ToastContext'

const TERMS_TEXT = `CAREER MIRROR AI — TERMS & CONDITIONS
Last updated: August 2026

1. Acceptance of Terms
By accessing or using Career Mirror AI ("the Service") you agree to be bound by these
Terms & Conditions and our Privacy Policy. If you do not agree, do not use the Service.

2. Description of the Service
Career Mirror AI provides resume parsing, skill extraction, job-description analysis,
compatibility scoring, learning roadmaps, progress tracking, and an AI career
assistant. Analysis results are algorithmic estimates for guidance only and are not a
guarantee of employment outcomes.

3. Eligibility
You must be at least 16 years old to use the Service. By registering you confirm that
the information you provide is accurate.

4. Accounts
- You are responsible for safeguarding your credentials.
- You must not share your account or allow others to use it.
- You must not create accounts for purposes that violate these terms.
- We may suspend or terminate accounts that violate these terms.

5. Acceptable Use
You agree NOT to:
- upload resumes or documents you do not have the right to process;
- upload malicious files, malware or content that infringes third-party rights;
- attempt to probe, scan or compromise the Service, its API or infrastructure;
- use the Service to harass, defame or discriminate;
- resell or sublicense the Service without written permission.

6. Your Content
You retain ownership of all content you upload. You grant us a limited license to
process, store and display your content solely to operate the Service. You are solely
responsible for the accuracy and legality of content you provide.

7. AI Assistant & Automated Analysis
The AI assistant and analysis engine produce suggestions generated algorithmically.
They may be incomplete or incorrect. You are responsible for verifying information
before relying on it in career decisions. The Service does not provide legal, financial
or recruitment advice.

8. Intellectual Property
The Service, including its design, software, text, graphics and the Career Mirror AI
brand, is owned by us or our licensors. You may not copy, modify, distribute or
reverse-engineer the Service except as permitted by law.

9. Third-Party Links & Resources
The Service may reference third-party learning resources, courses and websites. We do
not control and are not responsible for third-party content.

10. Privacy
Our Privacy Policy explains how we handle your data. It forms part of these terms.

11. Availability & Changes
We may update, modify or discontinue features of the Service at any time. We may also
revise these terms; the latest version will always be available on this page.

12. Disclaimers
The Service is provided "as is" and "as available" without warranties of any kind,
express or implied, including fitness for a particular purpose. We do not warrant that
the Service will be uninterrupted or error-free.

13. Limitation of Liability
To the maximum extent permitted by law, we shall not be liable for indirect,
incidental, special or consequential damages, or for loss of data, profits or
opportunities arising from your use of the Service.

14. Termination
You may stop using the Service at any time. We may suspend or terminate your account
for breach of these terms, illegal activity, or to protect the Service or other users.

15. Governing Law
These terms are governed by the laws of the jurisdiction in which the Service operator
is established, without regard to conflict-of-law principles.

16. Contact
Questions about these terms: hello@careermirror.ai
`

export default function Terms() {
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
              downloadTextFile('career-mirror-ai-terms-and-conditions.txt', TERMS_TEXT, 'text/plain')
              toast.success('Download started', 'Terms & Conditions saved as a text document.')
            }}
          >
            <Download size={15} /> Download terms
          </button>
        </div>

        <article className="legal-doc">
          <h1>Terms &amp; Conditions</h1>
          <p className="legal-updated">Last updated: August 2026 · Career Mirror AI</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Career Mirror AI ("the Service") you agree to be bound
            by these Terms &amp; Conditions and our Privacy Policy. If you do not agree,
            do not use the Service.
          </p>

          <h2>2. Description of the Service</h2>
          <p>
            Career Mirror AI provides resume parsing, skill extraction, job-description
            analysis, compatibility scoring, learning roadmaps, progress tracking and an
            AI career assistant. Analysis results are algorithmic estimates for guidance
            only and are not a guarantee of employment outcomes.
          </p>

          <h2>3. Eligibility</h2>
          <p>You must be at least 16 years old to use the Service. By registering you confirm that the information you provide is accurate.</p>

          <h2>4. Accounts</h2>
          <ul>
            <li>You are responsible for safeguarding your credentials.</li>
            <li>You must not share your account or allow others to use it.</li>
            <li>You must not create accounts for purposes that violate these terms.</li>
            <li>We may suspend or terminate accounts that violate these terms.</li>
          </ul>

          <h2>5. Acceptable Use</h2>
          <p>You agree <b>not</b> to:</p>
          <ul>
            <li>upload resumes or documents you do not have the right to process;</li>
            <li>upload malicious files, malware or content that infringes third-party rights;</li>
            <li>attempt to probe, scan or compromise the Service, its API or infrastructure;</li>
            <li>use the Service to harass, defame or discriminate;</li>
            <li>resell or sublicense the Service without written permission.</li>
          </ul>

          <h2>6. Your Content</h2>
          <p>
            You retain ownership of all content you upload. You grant us a limited
            license to process, store and display your content solely to operate the
            Service. You are solely responsible for the accuracy and legality of content
            you provide.
          </p>

          <h2>7. AI Assistant &amp; Automated Analysis</h2>
          <p>
            The AI assistant and analysis engine produce suggestions generated
            algorithmically. They may be incomplete or incorrect. You are responsible
            for verifying information before relying on it in career decisions. The
            Service does not provide legal, financial or recruitment advice.
          </p>

          <h2>8. Intellectual Property</h2>
          <p>
            The Service, including its design, software, text, graphics and the Career
            Mirror AI brand, is owned by us or our licensors. You may not copy, modify,
            distribute or reverse-engineer the Service except as permitted by law.
          </p>

          <h2>9. Third-Party Links &amp; Resources</h2>
          <p>
            The Service may reference third-party learning resources, courses and
            websites. We do not control and are not responsible for third-party content.
          </p>

          <h2>10. Privacy</h2>
          <p>Our Privacy Policy explains how we handle your data. It forms part of these terms.</p>

          <h2>11. Availability &amp; Changes</h2>
          <p>
            We may update, modify or discontinue features of the Service at any time. We
            may also revise these terms; the latest version will always be available on
            this page.
          </p>

          <h2>12. Disclaimers</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any
            kind, express or implied, including fitness for a particular purpose. We do
            not warrant that the Service will be uninterrupted or error-free.
          </p>

          <h2>13. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for indirect,
            incidental, special or consequential damages, or for loss of data, profits
            or opportunities arising from your use of the Service.
          </p>

          <h2>14. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate your
            account for breach of these terms, illegal activity, or to protect the
            Service or other users.
          </p>

          <h2>15. Governing Law</h2>
          <p>
            These terms are governed by the laws of the jurisdiction in which the Service
            operator is established, without regard to conflict-of-law principles.
          </p>

          <h2>16. Contact</h2>
          <p>Questions about these terms: <b>hello@careermirror.ai</b></p>
        </article>
      </div>
    </div>
  )
}
