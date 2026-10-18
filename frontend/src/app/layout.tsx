import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from '@/store/provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  weight: '400',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HZSITD — Official Paperless Letter & Correspondence Portal',
  description: 'Hadiya Zone Science & Information Technology Department Official Digital Workflow, Approval, and QR Letter Verification System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var w = window.innerWidth;
                var h = window.innerHeight;
                var isLandscapePhone = (h <= 500 && w <= 950 && window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
                var isPortraitPhone = (w < 768);
                var ua = navigator.userAgent || '';
                var isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (w >= 768 && h >= 501);
                var isPhone = !isTablet && (isPortraitPhone || isLandscapePhone || /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua));
                if (isPhone) {
                  window.location.replace('/html/index.html');
                }
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
