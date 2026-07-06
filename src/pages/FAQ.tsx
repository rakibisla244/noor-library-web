import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    category: 'Orders & Downloads',
    items: [
      { q: 'How do I download my purchased eBooks?', a: 'After successful payment, your eBooks are instantly available in your dashboard under "Purchased Books". Click the download button next to each book to save the PDF to your device.' },
      { q: 'Can I re-download a book I already purchased?', a: 'Yes! Once you purchase a book, it is permanently linked to your account. You can download it as many times as you need from your dashboard.' },
      { q: 'What format are the eBooks in?', a: 'All our eBooks are in PDF format, which can be read on any device — computers, tablets, smartphones, and e-readers.' },
      { q: 'How long does it take to receive my books?', a: 'Instantly! As soon as your payment is confirmed, your books are available for download in your dashboard.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept bKash, Nagad, Rocket, and SSLCommerz (which supports Visa, Mastercard, American Express, and net banking).' },
      { q: 'Is it safe to pay on Noor Library?', a: 'Yes. All payments are processed through secure, encrypted payment gateways. We never store your payment details.' },
      { q: 'Do you offer Cash on Delivery?', a: 'No. Since our products are digital, all payments must be completed online before you can download your books.' },
      { q: 'Can I get a refund?', a: 'Due to the digital nature of our products, refunds are generally not available once a book has been downloaded. However, if you experience a technical issue, please contact us and we will help resolve it.' },
    ],
  },
  {
    category: 'Account',
    items: [
      { q: 'Do I need an account to buy books?', a: 'Yes, an account is required to purchase and download books. This ensures your library is always accessible to you and protects your purchases.' },
      { q: 'I forgot my password. What do I do?', a: 'Click the "Forgot Password" link on the login page and enter your email. You will receive a reset link to create a new password.' },
      { q: 'Can I change my email address?', a: 'Currently, you cannot change your email address after registration. If you need to, please contact our support team.' },
      { q: 'How do I delete my account?', a: 'To delete your account, please contact our support team. Note that this will also remove access to your purchased books.' },
    ],
  },
  {
    category: 'Content & Quality',
    items: [
      { q: 'Are your books authentic?', a: 'Yes. Every book in our collection is reviewed for authenticity before being listed. We work with reputable publishers and scholars.' },
      { q: 'In which languages are your books available?', a: 'Our books are available in Bangla, English, and Arabic. You can filter by language on the Shop page.' },
      { q: 'Can I request a book that is not in your collection?', a: 'Absolutely! Use our contact form to suggest a book. We are always expanding our collection based on reader requests.' },
    ],
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<string | null>('Orders & Downloads-0');

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-12">
        <div className="container-page text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-ink-900 sm:text-4xl">Frequently Asked Questions</h1>
          <p className="mx-auto mt-2 max-w-2xl text-ink-500">Find answers to common questions about orders, payments, downloads, and more.</p>
        </div>
      </section>

      <div className="container-narrow py-12">
        <div className="space-y-10">
          {FAQS.map((group) => (
            <div key={group.category}>
              <h2 className="mb-4 text-xl font-bold text-ink-900">{group.category}</h2>
              <div className="space-y-3">
                {group.items.map((item, i) => {
                  const key = `${group.category}-${i}`;
                  const isOpen = open === key;
                  return (
                    <div key={key} className="card overflow-hidden">
                      <button
                        onClick={() => setOpen(isOpen ? null : key)}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      >
                        <span className="font-semibold text-ink-900">{item.q}</span>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-emerald-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-700 animate-fade-in">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-emerald-50 p-8 text-center">
          <h3 className="text-xl font-bold text-ink-900">Still have questions?</h3>
          <p className="mt-2 text-sm text-ink-600">Our support team is here to help you.</p>
          <a href="/contact" className="btn-primary mt-4">Contact Support</a>
        </div>
      </div>
    </div>
  );
}
