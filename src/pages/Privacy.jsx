import workbenchIcon from '../assets/workbench-icon-2x.png'
import { PublicMobileHeader } from './auth/PublicMobileHeader'
import { PublicLegalFooter } from './auth/PublicLegalFooter'
import './Terms.css'

function PrivacyDesktopHeader({ onNavigate }) {
  return <header className="terms-desktop-header">
    <button type="button" className="terms-brand" onClick={() => onNavigate?.('Splash')} aria-label="Go to Workbench home">
      <img src={workbenchIcon} alt="" />
      <span>Workbench</span>
    </button>
    <nav className="terms-desktop-actions" aria-label="Account navigation">
      <button type="button" onClick={() => onNavigate?.('Login')}>Log in</button>
      <button type="button" className="terms-desktop-primary" onClick={() => onNavigate?.('Signup')}>Create account</button>
    </nav>
  </header>
}

export function Privacy({ onNavigate }) {
  return <main className="terms-page">
    <PublicMobileHeader onNavigate={onNavigate} />
    <PrivacyDesktopHeader onNavigate={onNavigate} />
    <article className="terms-document" aria-labelledby="privacy-title">
      <header className="terms-document-header">
        <p className="terms-eyebrow">WORKBENCH LEGAL</p>
        <h1 id="privacy-title">Privacy Policy</h1>
        <p className="terms-updated">Last updated: October 12, 2026</p>
        <p className="terms-intro">Workbench, Inc. ("Workbench," "we," "our," or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains what information we collect, how we use it, when we share it, how we protect it, and your privacy rights.</p>
      </header>

      <div className="terms-content">
        <section><h2>1. Scope</h2><p>This Privacy Policy applies to the Workbench website, software, and services. It also applies to Workbench mobile applications, APIs, and related products or features when those services are provided.</p></section>
        <section><h2>2. Information we collect</h2><p>We may collect account information such as your name, email address, phone number when provided, organization name, team size, account credentials, passkey information, support requests, and communications with Workbench.</p><p>If you purchase a subscription, payment information is processed by our payment providers when applicable. Workbench does not store full credit card numbers.</p><p>When enabled for your workspace, customers may store asset information, equipment records, work orders, preventive maintenance schedules, inventory records, photos, documents, procedures, checklists, safety documents, user comments, and communications. We refer to this information as Customer Data.</p><p>When you access Workbench, we may collect IP address, browser type, device type, operating system, application version, login history, usage statistics, performance information, and error logs. This information helps us maintain security, troubleshoot problems, and improve our services.</p></section>
        <section><h2>3. How we use information</h2><p>We use information to:</p><ul><li>Provide and maintain Workbench.</li><li>Authenticate users.</li><li>Deliver customer support.</li><li>Improve product functionality and develop new features.</li><li>Monitor performance and reliability.</li><li>Detect fraud and security incidents.</li><li>Comply with legal obligations.</li><li>Communicate important service updates.</li><li>Send marketing communications where permitted by law and subject to available opt-out controls.</li></ul></section>
        <section><h2>4. Customer Data and organization accounts</h2><p>Customers retain ownership of all Customer Data uploaded to Workbench. Workbench does not claim ownership of Customer Data.</p><p>We use Customer Data only as necessary to operate the Service, provide support, maintain system performance, meet contractual obligations, and comply with applicable law.</p><p>If you use Workbench through your employer or another organization, information associated with your account may be visible to authorized administrators within that organization. The organization may control the workspace data and may be responsible for responding to requests about that data.</p></section>
        <section><h2>5. AI Features</h2><p>Workbench may offer AI-powered features when enabled for your account, including assistance with work order generation, procedure creation, asset recommendations, maintenance analysis, or reporting.</p><p>AI-generated outputs may contain inaccuracies. Customers are responsible for reviewing and validating AI-generated content before relying on it. Workbench will not use Customer Data to train public AI models without the customer's explicit consent.</p></section>
        <section><h2>6. When we share information</h2><p>We do not sell personal information. We may share information with trusted vendors that help us operate the platform, including cloud hosting providers, payment processors when applicable, analytics providers when enabled, customer support providers, and security monitoring services.</p><p>We may disclose information when required by law, court order, government request, or regulatory requirement, or when necessary to protect Workbench, our users, or the public. If Workbench is involved in a merger, acquisition, or sale of assets, information may be transferred as part of that transaction.</p></section>
        <section><h2>7. Cookies and local storage</h2><p>Workbench uses cookies and similar technologies, including browser storage where needed, to keep users signed in, remember preferences, support security, and maintain service functionality. If analytics or other non-essential technologies are enabled, we may use them to measure usage, improve performance, and understand product adoption.</p><p>Users can control cookies through browser settings. Disabling certain technologies may affect platform functionality.</p></section>
        <section><h2>8. Security</h2><p>Workbench maintains reasonable administrative, technical, and physical safeguards designed to protect information. Depending on the service and feature involved, safeguards may include encryption in transit, access controls, security monitoring, and regular software updates. No system can guarantee absolute security, but we continuously work to protect customer information.</p></section>
        <section><h2>9. Retention and deletion</h2><p>We retain information only as long as necessary to provide services, meet legal obligations, resolve disputes, and enforce agreements. Following account termination, Workbench may retain certain records as required by law or for legitimate business purposes.</p><p>Customer Data can generally be exported before account closure and, subject to the Terms or applicable agreement, may remain available for export for 30 days after termination.</p></section>
        <section><h2>10. Children</h2><p>Workbench is intended for business use and is not directed toward individuals under the age of 18. We do not knowingly collect information from children. If we become aware that information from a child has been collected, we will take steps to delete it.</p></section>
        <section><h2>11. Privacy rights</h2><p>Depending on your location, you may have rights to access your information, correct inaccurate information, delete information, restrict processing, object to certain processing activities, receive a copy of your data, and withdraw consent where applicable.</p><p>Requests may be submitted using the privacy contact information below. We may need to verify your identity before completing a request. If you are using Workbench through your employer, some requests may need to be directed to your employer, who controls the account and associated data.</p></section>
        <section><h2>12. California residents</h2><p>California residents may have rights under the California Consumer Privacy Act, including the right to know, access, correct, delete, receive portable copies of personal information, opt out of certain sale or sharing activities where applicable, and receive equal service. Workbench does not sell personal information or share it for cross-context behavioral advertising. To exercise your rights, contact us using the information below.</p></section>
        <section><h2>13. International data transfers</h2><p>Workbench may process and store information in the United States or other countries where our service providers operate. Information may therefore be transferred and processed outside your country of residence. Where required, Workbench uses appropriate safeguards for cross-border data transfers.</p><p>Where GDPR or similar laws apply, Workbench processes personal information based on performance of a contract, legitimate business interests, legal obligations, or consent when required. Residents of these regions may have additional rights under applicable privacy laws.</p></section>
        <section><h2>14. Changes to this Privacy Policy</h2><p>We may update this Privacy Policy from time to time. Material changes may be communicated through email, in-product notifications, or website notices. The "Last Updated" date at the top of this Privacy Policy indicates when the most recent changes were made.</p></section>
        <section><h2>15. Contact</h2><p>Workbench, Inc.<br />Privacy questions: privacy@workbench.com<br />Security concerns: security@workbench.com<br />Support: support@workbench.com<br />Website: https://www.workbench.com<br /><br />Mailing address:<br />Workbench, Inc.<br />Attn: Privacy Officer<br />Findlay, Ohio</p></section>
      </div>

    </article>
    <PublicLegalFooter onNavigate={onNavigate} activePage="privacy" />
  </main>
}
