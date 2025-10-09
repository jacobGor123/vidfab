"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { SpaceBackground } from "@/components/space-background"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"

export default function TermsOfServicePage() {
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)

    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <SpaceBackground />
        <Navbar scrolled={scrolled} />
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto">
            <SkeletonLoader type="title" className="mb-6" />
            <SkeletonLoader type="text" count={20} className="mb-4" />
          </div>
        </div>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Loading Terms of Service..." />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <SpaceBackground />
      <Navbar scrolled={scrolled} />

      <main>
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Terms of Service
            </h1>
            <p className="text-gray-400 mb-12">
              Last Updated: October 9, 2025
            </p>

            <div className="space-y-12">
              <section>
                <p className="text-gray-300 leading-relaxed">
                  Welcome to VidFab ("we," "our," "us"). These Terms of Service ("Terms") govern your use of our website, products, and services, including our AI Video Generator (collectively, the "Services"). By accessing or using our Services, you agree to these Terms. If you do not agree, you may not use our Services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  1. Eligibility
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  You must be at least 18 years old (or the age of legal majority in your jurisdiction) to use our Services. By using our Services, you represent that you meet these requirements.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  2. Accounts & Registration
                </h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You may need to create an account to access certain features.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You agree to provide accurate, complete information during registration.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You are responsible for maintaining the confidentiality of your account credentials.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You must notify us immediately of unauthorized account use.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  3. Use of Services
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  You agree to use the Services only for lawful purposes and in compliance with these Terms. You may not:
                </p>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Upload or generate content that is illegal, harmful, defamatory, or infringing.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Use the Services for harassment, deepfakes without consent, or misleading information.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Reverse-engineer, copy, or resell our Services without written permission.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Interfere with or disrupt our systems or security.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  4. Content & Intellectual Property
                </h2>

                <h3 className="text-xl font-bold mb-3 text-white mt-6">
                  4.1 User Content
                </h3>
                <ul className="space-y-3 text-gray-300 mb-6">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You retain ownership of the text, images, or other materials ("User Content") you upload.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>By uploading, you grant us a license to process, host, and display User Content to provide the Services.</span>
                  </li>
                </ul>

                <h3 className="text-xl font-bold mb-3 text-white">
                  4.2 AI-Generated Content
                </h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Videos generated using our Services ("Generated Content") are licensed to you under the terms below:
                </p>
                <ul className="space-y-3 text-gray-300 mb-6">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong className="text-white">Personal/Commercial Use:</strong> You may use Generated Content for personal or commercial purposes, subject to compliance with these Terms.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong className="text-white">Restrictions:</strong> You may not claim that AI-generated videos were entirely human-made, or use them for illegal, harmful, or misleading purposes.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We may limit or revoke your rights to Generated Content if it violates laws or policies.</span>
                  </li>
                </ul>

                <h3 className="text-xl font-bold mb-3 text-white">
                  4.3 Our IP
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  All intellectual property in the Services (software, website, models, trademarks, etc.) remains owned by VidFab.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  5. Payments & Subscriptions
                </h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Certain features require paid subscriptions. Prices and billing terms are described on our website.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Fees are non-refundable except as required by law.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>We may change pricing with reasonable notice.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  6. Termination
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We may suspend or terminate your account if you:
                </p>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Violate these Terms.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Misuse the Services.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Fail to pay applicable fees.</span>
                  </li>
                </ul>
                <p className="text-gray-300 leading-relaxed mt-4">
                  You may also delete your account at any time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  7. Disclaimer of Warranties
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Our Services are provided "as is" and "as available."
                </p>
                <p className="text-gray-300 leading-relaxed">
                  We do not guarantee that the Services will be error-free, uninterrupted, or suitable for every purpose.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  8. Limitation of Liability
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  To the fullest extent permitted by law, VidFab is not liable for:
                </p>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Indirect, incidental, or consequential damages.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Loss of profits, data, or reputation.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Any damages arising from misuse of AI-generated content.</span>
                  </li>
                </ul>
                <p className="text-gray-300 leading-relaxed mt-4">
                  Our total liability shall not exceed the amount you paid for the Services in the past 12 months.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  9. Indemnification
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  You agree to indemnify and hold harmless VidFab, its affiliates, and employees from claims, damages, or expenses arising from:
                </p>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Your use of the Services.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Your violation of these Terms.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Your misuse of AI-generated videos.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  10. Changes to the Terms
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  We may update these Terms occasionally. The updated version will be posted with a new effective date. Continued use of the Services means you accept the changes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  11. Contact Us
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  For questions about these Terms, contact us at: <a href="mailto:support@vidfab.ai" className="text-purple-400 hover:text-purple-300 transition-colors">support@vidfab.ai</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
