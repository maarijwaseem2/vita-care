import type { Metadata } from 'next';
import { Poppins, Inter, Noto_Nastaliq_Urdu } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

// Nastaliq is how Urdu is normally read; used for Urdu chat and replies.
const urdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-urdu',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vita Care | AI Doctor in Urdu & English, book the right specialist',
  description:
    'Describe your symptoms in Urdu, Roman Urdu or English. The Vita Care AI Doctor (Alibaba Cloud Qwen) asks the right questions, flags emergencies, and books you with a real specialist who sees your history first.',
  icons: { icon: '/favicons/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Font variables live on <html> because globals.css reads them in :root.
    <html lang="en" className={`${poppins.variable} ${inter.variable} ${urdu.variable}`}>
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
