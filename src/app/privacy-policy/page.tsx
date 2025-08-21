"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Header with back button */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center text-btn-primary hover:text-btn-primary-hover transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 md:p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">
              Privacy Policy
            </h1>
            <p className="text-gray-400">Last Updated: 08/21/2025</p>
          </header>

          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-6">
              This Privacy Policy describes how tuuli Chat (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects
              your information when you use our Service at chat.tuuli.moe.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                1. Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Personal Information
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>
                  Account information (email, username) collected through Clerk
                  authentication
                </li>
                <li>Usage data and analytics</li>
                <li>
                  Technical information (IP address, browser type, device
                  information)
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Chat Data
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Messages and conversations you have with our AI models</li>
                <li>Timestamps and metadata associated with your chats</li>
                <li>Usage patterns and preferences</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-gray-300 mb-4">We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Provide and maintain our AI chat services</li>
                <li>Process your messages through Google Gemini models</li>
                <li>Manage your account and authentication</li>
                <li>Monitor and analyze usage patterns</li>
                <li>Improve our Service and user experience</li>
                <li>Communicate with you about the Service</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                3. Information Sharing and Third-Party Services
              </h2>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Google Cloud Platform and Gemini Models
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>
                  Your chat messages are sent to Google&apos;s servers for AI
                  processing
                </li>
                <li>
                  This is essential for providing our AI chat functionality
                </li>
                <li>
                  Google&apos;s privacy policies and data handling practices
                  apply to this processing
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Third-Party Service Providers
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>
                  Clerk: Handles user authentication and account management
                </li>
                <li>DigitalOcean: Hosts our web servers in Singapore</li>
                <li>Supabase (AWS): Hosts our user database in Singapore</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                We Do Not Sell Your Data
              </h3>
              <p className="text-gray-300">
                We do not sell, trade, or rent your personal information to
                third parties for marketing purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                4. Data Security and Storage
              </h2>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Security Measures
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>
                  All data transmission is secured with SSL/HTTPS encryption
                </li>
                <li>
                  We implement appropriate technical and organizational security
                  measures
                </li>
                <li>
                  Access to your data is restricted to authorized personnel only
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Data Storage
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>
                  Web Servers: Hosted on DigitalOcean servers in Singapore
                </li>
                <li>Database: Hosted on Supabase AWS servers in Singapore</li>
                <li className="text-red-400 font-bold">
                  <strong>Important:</strong> Chat messages are NOT encrypted in
                  our database but are secured in transit
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Data Retention
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>We retain your data as long as your account is active</li>
                <li>You may request account deletion at any time</li>
                <li>
                  Some data may be retained for legal or operational
                  requirements
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                5. Your Privacy Rights
              </h2>
              <p className="text-gray-300 mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Withdraw consent where applicable</li>
                <li>Request data portability</li>
                <li>Object to certain data processing activities</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Account Deletion
              </h3>
              <p className="text-gray-300">
                You can delete your account at any time through your account
                settings. Upon deletion, we will remove your personal
                information and chat history, subject to legal retention
                requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                6. Cookies and Tracking
              </h2>
              <p className="text-gray-300 mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns</li>
                <li>Improve user experience</li>
              </ul>
              <p className="text-gray-300">
                You can control cookie settings through your browser
                preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                7. Data Transfers
              </h2>
              <p className="text-gray-300 mb-4">
                Your data may be processed and stored in different countries:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                <li>Primary servers located in Singapore</li>
                <li>Google&apos;s global infrastructure for AI processing</li>
              </ul>
              <p className="text-gray-300">
                We ensure appropriate safeguards for international data
                transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                8. Children&apos;s Privacy
              </h2>
              <p className="text-gray-300">
                Our Service is not intended for users under 13 years of age. We
                do not knowingly collect personal information from children
                under 13. If we become aware of such collection, we will take
                steps to delete the information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                9. California Privacy Rights (CCPA)
              </h2>
              <p className="text-gray-300">
                If you are a California resident, you have additional rights
                under the California Consumer Privacy Act, including the right
                to know what personal information we collect and how it&apos;s
                used.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                10. European Privacy Rights (GDPR)
              </h2>
              <p className="text-gray-300">
                If you are in the European Union, you have rights under the
                General Data Protection Regulation, including the right to
                access, rectify, erase, and port your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-300">
                We may update this Privacy Policy periodically. Material changes
                will be communicated through the Service or via email. The
                &quot;Last Updated&quot; date will reflect when changes were
                made.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                12. Contact Us
              </h2>
              <p className="text-gray-300 mb-4">
                For privacy-related questions or to exercise your privacy
                rights, please contact us at:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Email: hi@tuuli.moe</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                13. Data Protection Officer
              </h2>
              <p className="text-gray-300">
                If required by applicable law, you can contact our Data
                Protection Officer at hi@tuuli.moe.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
