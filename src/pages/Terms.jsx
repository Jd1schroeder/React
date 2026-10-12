import workbenchIcon from '../assets/workbench-icon-2x.png'
import { PublicMobileHeader } from './auth/PublicMobileHeader'
import { PublicLegalFooter } from './auth/PublicLegalFooter'
import './Terms.css'

function TermsDesktopHeader({ onNavigate }) {
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

export function Terms({ onNavigate }) {
  return <main className="terms-page">
    <PublicMobileHeader onNavigate={onNavigate} />
    <TermsDesktopHeader onNavigate={onNavigate} />
    <article className="terms-document" aria-labelledby="terms-title">
      <header className="terms-document-header">
        <p className="terms-eyebrow">WORKBENCH LEGAL</p>
        <h1 id="terms-title">Terms of Service</h1>
        <p className="terms-updated">Last updated: October 12, 2026</p>
        <p className="terms-intro">These Terms of Service ("Terms") govern your access to and use of the Workbench platform, website, mobile applications, APIs, and related services (collectively, the "Service").</p>
      </header>

      <div className="terms-content">
        <section><h2>1. Agreement and definitions</h2><p>By creating an account, accepting an order form, or using the Service, you agree to be bound by these Terms. If you are accepting these Terms on behalf of a company or organization, you represent that you have authority to bind that organization.</p><p>"Workbench" means Workbench, Inc. "Customer" means the individual or entity using the Service. "Users" means individuals authorized by Customer to use the Service. "Customer Data" means all information, documents, records, photos, maintenance data, asset information, and other content submitted to the Service by Customer or its Users. "Subscription Term" means the period during which Customer is authorized to access the Service. "AI Features" means any artificial intelligence or machine-learning functionality included in the Service.</p></section>
        <section><h2>2. Access and service changes</h2><p>Subject to these Terms and payment of applicable fees, Workbench grants Customer a limited, non-exclusive, non-transferable right to access and use the Service for internal business purposes. Customer may authorize its Users to access the Service under Customer's account.</p><p>Workbench may update, modify, or improve the Service from time to time.</p></section>
        <section><h2>3. Customer responsibilities</h2><p>Customer is responsible for:</p><ul><li>Maintaining account security.</li><li>Managing User access.</li><li>Ensuring the accuracy of Customer Data.</li><li>Complying with applicable laws and regulations.</li><li>Activities conducted under Customer accounts.</li></ul><p>Customer shall promptly notify Workbench of any unauthorized account access.</p></section>
        <section><h2>4. Acceptable use</h2><p>Customer and Users shall not:</p><ul><li>Violate applicable laws.</li><li>Upload malware or malicious code.</li><li>Attempt unauthorized access to the Service.</li><li>Reverse engineer the Service.</li><li>Resell or sublicense the Service.</li><li>Use the Service to develop a competing product.</li><li>Disrupt or interfere with platform operations.</li></ul><p>Workbench may suspend access for violations of this section.</p></section>
        <section><h2>5. Customer Data and AI Features</h2><p>Customer retains ownership of all Customer Data. Customer grants Workbench a limited license to use Customer Data solely to:</p><ul><li>Provide the Service.</li><li>Maintain system functionality.</li><li>Deliver support.</li><li>Improve platform performance.</li><li>Meet legal obligations.</li></ul><p>Workbench will not sell Customer Data. Workbench will not use Customer Data to train public AI models without Customer's express consent.</p><p>AI-generated content may be inaccurate, incomplete, or inappropriate for a particular use case. Customer is responsible for reviewing and validating all AI-generated outputs before acting on them. Workbench makes no warranty regarding the accuracy of AI-generated results.</p></section>
        <section><h2>6. Security and confidentiality</h2><p>Workbench will maintain commercially reasonable administrative, technical, and physical safeguards designed to protect Customer Data. No security system is completely secure, and Workbench cannot guarantee absolute protection against all threats.</p><p>Each party shall protect the confidential information of the other party using reasonable care. Neither party shall disclose confidential information except to employees, contractors, or advisors who require access, as required by law, or with prior written consent.</p></section>
        <section><h2>7. Fees and payment</h2><p>Customer agrees to pay all fees specified in applicable order forms, invoices, or subscription plans. Unless otherwise agreed:</p><ul><li>Fees are paid in advance.</li><li>Fees are non-refundable.</li><li>Late payments may incur interest at 1.5% per month or the maximum amount permitted by law.</li></ul><p>Workbench may suspend access for overdue accounts.</p></section>
        <section><h2>8. Intellectual property</h2><p>Workbench retains all ownership rights in the Service, software, APIs, documentation, branding, and platform improvements. Except for rights expressly granted in these Terms, no ownership rights are transferred to Customer.</p></section>
        <section><h2>9. Warranties and disclaimers</h2><p>Workbench warrants that it will provide the Service in a professional and commercially reasonable manner.</p><p>EXCEPT AS EXPRESSLY PROVIDED, THE SERVICE IS PROVIDED "AS IS" AND WITHOUT WARRANTIES OF ANY KIND. WORKBENCH DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p></section>
        <section><h2>10. Limitation of liability</h2><p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, WORKBENCH'S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT PAID BY CUSTOMER DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</p><p>NEITHER PARTY SHALL BE LIABLE FOR LOST PROFITS, LOST REVENUE, LOSS OF DATA, BUSINESS INTERRUPTION, INDIRECT DAMAGES, CONSEQUENTIAL DAMAGES, OR PUNITIVE DAMAGES.</p></section>
        <section><h2>11. Indemnification</h2><p>Customer shall defend and indemnify Workbench against claims arising from Customer Data, Customer misuse of the Service, violation of law, or infringement caused by Customer materials.</p><p>Workbench shall defend Customer against third-party claims alleging that the Service infringes intellectual property rights.</p></section>
        <section><h2>12. Termination and data export</h2><p>These Terms remain effective while Customer uses the Service. Either party may terminate:</p><ul><li>For material breach not cured within 30 days.</li><li>If the other party becomes insolvent.</li><li>As otherwise permitted by applicable agreements.</li></ul><p>Upon termination, access to the Service will end. Customer may export Customer Data for 30 days. Workbench may delete Customer Data after the retention period expires.</p></section>
        <section><h2>13. Renewals and pricing</h2><p>Subscriptions automatically renew for successive terms unless either party provides written notice of non-renewal at least thirty (30) days before the expiration of the current term. Workbench will provide advance notice of material pricing changes.</p></section>
        <section><h2>14. Governing law and disputes</h2><p>These Terms shall be governed by the laws of the State of Ohio, without regard to conflict-of-law principles. Any disputes shall be resolved in the state or federal courts located in Hancock County, Ohio, unless otherwise agreed by the parties.</p></section>
        <section><h2>15. Changes to these Terms</h2><p>Workbench may update these Terms from time to time. If changes materially affect Customer rights, Workbench will provide notice through the Service or by email. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.</p></section>
        <section><h2>16. Contact</h2><p>Workbench, Inc.<br />Email: legal@workbench.com<br />Support: support@workbench.com<br />Website: https://www.workbench.com</p></section>
      </div>

    </article>
    <PublicLegalFooter onNavigate={onNavigate} activePage="terms" />
  </main>
}
