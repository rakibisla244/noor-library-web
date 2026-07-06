import { Link } from 'react-router-dom';
import { ChevronRight, Shield } from 'lucide-react';

export default function Privacy() {
  const sections = [
    { title: 'Introduction', body: 'Noor Library ("we", "us", "our") respects your privacy and is committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information when you use our website and services.' },
    { title: 'Information We Collect', body: 'We collect the following types of information: (1) Account information — name, email address, and password when you register. (2) Payment information — processed securely through our payment partners (bKash, Nagad, Rocket, SSLCommerz). We do not store full payment details. (3) Usage data — pages visited, books viewed, and download history. (4) Device information — IP address, browser type, and operating system.' },
    { title: 'How We Use Your Information', body: 'We use your information to: process and fulfill your orders; provide access to purchased eBooks; send order confirmations and important account notifications; improve our services and user experience; prevent fraud and unauthorized access; comply with legal obligations.' },
    { title: 'Data Storage and Security', body: 'Your data is stored securely using industry-standard encryption. Payment information is processed by our certified payment partners and is never stored on our servers. We use row-level security and access controls to protect your account data.' },
    { title: 'Sharing Your Information', body: 'We do not sell your personal information. We share data only with: payment processors to complete transactions; hosting providers to deliver our services; legal authorities when required by law. All third parties are bound by confidentiality obligations.' },
    { title: 'Cookies', body: 'We use cookies and similar technologies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookies through your browser settings.' },
    { title: 'Your Rights', body: 'You have the right to: access your personal data; correct inaccurate information; request deletion of your account; opt out of marketing communications; download a copy of your data.' },
    { title: 'Children\'s Privacy', body: 'Our services are not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us information, please contact us.' },
    { title: 'Changes to This Policy', body: 'We may update this policy from time to time. We will notify you of significant changes by posting the updated policy on this page with a new effective date.' },
    { title: 'Contact Us', body: 'If you have questions about this privacy policy, please contact us at hello@noorlibrary.com or through our contact page.' },
  ];

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-12">
        <div className="container-page">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
            <Link to="/" className="hover:text-emerald-700">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink-700">Privacy Policy</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-ink-900">Privacy Policy</h1>
              <p className="text-sm text-ink-500">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-narrow py-12">
        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">{i + 1}</span>
                {s.title}
              </h2>
              <p className="mt-3 leading-relaxed text-ink-700">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
