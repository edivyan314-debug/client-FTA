import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import DemoModeBar from '@/components/DemoModeBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Citizen FTA — Feedback-to-Action Loop',
  description: 'AI-powered civic grievance resolution platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <DemoModeBar />
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-700 hover:text-indigo-800">
                <span>🏛️</span>
                <span>Citizen FTA</span>
              </Link>
              <div className="flex items-center gap-6">
                <Link
                  href="/citizen"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  📝 Report Issue
                </Link>
                <Link
                  href="/officer"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  🛡️ Officer Workbench
                </Link>
                <Link
                  href="/scorecard"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  📊 Public Scorecard
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="mt-16 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
          © 2024 Citizen FTA — AI-Powered Civic Grievance Resolution
        </footer>
      </body>
    </html>
  );
}
