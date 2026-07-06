import { Link } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';

export default function Terms() {
  const sections = [
    { title: 'Acceptance of Terms', body: 'By accessing and using Noor Library, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.' },
    { title: 'Definitions', body: '"Noor Library" refers to our eBook marketplace platform. "eBooks" refers to digital books in PDF format sold on our platform. "User" refers to any person who accesses or uses our services.' },
    { title: 'Account Registration', body: 'To purchase books, you must register for an account. You agree to provide accurate, complete information and to keep your account credentials secure. You are responsible for all activities under your account.' },
    { title: 'Purchases and Payments', body: 'All prices are in Bangladeshi Taka (BDT). We accept bKash, Nagad, Rocket, and SSLCommerz. Payment must be completed before eBooks are made available for download. Prices may change without notice.' },
    { title: 'Digital Products', body: 'Our eBooks are digital products delivered electronically. Upon successful payment, you will have instant access to download your purchased eBooks from your dashboard.' },
    { title: 'Refund Policy', body: 'Due to the digital nature of our products, refunds are generally not available once an eBook has been downloaded. If you experience technical issues or receive a corrupted file, please contact us within 7 days for assistance.' },
    { title: 'Copyright and Usage', body: 'All eBooks are protected by copyright law. Your purchase grants you a personal, non-transferable license to read and download the eBook for your own use. You may not: redistribute, resell, copy, share, or commercially exploit the eBooks; upload them to file-sharing platforms; or remove copyright notices.' },
    { title: 'Anti-Piracy', body: 'We actively monitor for unauthorized distribution of our eBooks. Violators may face account termination and legal action. Each download is logged and tracked to prevent piracy.' },
    { title: 'User Conduct', body: 'You agree not to: misuse the service; attempt unauthorized access; interfere with site operations; provide false information; or violate any laws. Violations may result in account suspension.' },
    { title: 'Limitation of Liability', body: 'Noor Library is not liable for indirect, incidental, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount you paid for the eBook in question.' },
    { title: 'Changes to Terms', body: 'We may update these terms at any time. Continued use of our services after changes constitutes acceptance of the updated terms.' },
    { title: 'Contact', body: 'For questions about these terms, contact us at hello@noorlibrary.com.' },
  ];

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-12">
        <div className="container-page">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
            <Link to="/" className="hover:text-emerald-700">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink-700">Terms & Conditions</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-ink-900">Terms & Conditions</h1>
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
