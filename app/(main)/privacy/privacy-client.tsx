"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { SpaceBackground } from "@/components/space-background"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"

export default function PrivacyPage() {
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
          <LoadingState message="Loading Privacy Policy..." />
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
              Privacy Policy
            </h1>
            <p className="text-gray-400 mb-12">
              Last Updated: October 9, 2025
            </p>

            <div className="space-y-12">
              <section>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Welcome to our Privacy Policy. Your privacy is critically important to us. This policy explains how we collect, use, and protect your information when you use our AI video generator services.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  We are committed to secure, transparent, and user-focused data practices. Below, you'll find a clear overview of how we handle your personal information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  1. Introduction
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  This Privacy Policy outlines how we collect, use, and safeguard the personal information you provide when using our website and AI video generator services (collectively referred to as "Services"). By using our Services, you agree to the collection and use of information as described in this policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  2. Information We Collect
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  We collect information to provide and improve our Services and ensure you have a seamless user experience. The type of data we collect depends on how you interact with our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  3. Information You Provide to Us
                </h2>
                <ul className="space-y-4 text-gray-300">
                  <li>
                    <strong className="text-white">Account Information:</strong> When you sign up, we collect your name, email address, password, and other details needed to create and manage your account.
                  </li>
                  <li>
                    <strong className="text-white">Uploaded Content:</strong> If you upload videos, images, audios, or other assets to generate AI videos, we collect and process this content solely to provide the requested service.
                  </li>
                  <li>
                    <strong className="text-white">Payment Information:</strong> For subscriptions or purchases, we use secure third-party payment processors. We do not store your full payment details but may receive transaction-related information like the last four digits of your card and payment history.
                  </li>
                  <li>
                    <strong className="text-white">Communications:</strong> If you contact us for support or inquiries, we collect the details of your message and any attachments.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  4. Information We Collect Automatically
                </h2>
                <ul className="space-y-4 text-gray-300">
                  <li>
                    <strong className="text-white">Usage Data:</strong> We collect data on how you interact with our Services, such as IP addresses, device type, browser type, pages viewed, and time spent on our platform. This helps us improve functionality and performance.
                  </li>
                  <li>
                    <strong className="text-white">Cookies and Tracking Technologies:</strong> We use cookies and similar technologies to enhance your experience and track activity on our platform. You can manage cookie preferences through your browser settings.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  5. How We Use Your Information
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We use your information to deliver, maintain, and improve our AI video generator services, as well as to provide you with a personalized experience.
                </p>
                <ul className="space-y-4 text-gray-300">
                  <li>
                    <strong className="text-white">Service Delivery:</strong> To process your requests, generate videos, and manage your account.
                  </li>
                  <li>
                    <strong className="text-white">Improvement and Personalization:</strong> To analyze user behavior, enhance our AI models, and improve platform functionality.
                  </li>
                  <li>
                    <strong className="text-white">Communication:</strong> To send updates, service notifications, and marketing messages (which you can opt out of anytime).
                  </li>
                  <li>
                    <strong className="text-white">Security and Fraud Prevention:</strong> To protect against unauthorized use, fraud, and potential harm to our Services or users.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  6. How We Share Your Information
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We respect your privacy and do not sell your data. We only share your information under the following circumstances:
                </p>
                <ul className="space-y-4 text-gray-300">
                  <li>
                    <strong className="text-white">Service Providers:</strong> Trusted third-party vendors assist us with services such as payment processing, data hosting, AI model training, and email delivery. These vendors are bound by strict confidentiality agreements.
                  </li>
                  <li>
                    <strong className="text-white">Legal Compliance:</strong> We may share information if required by law, court orders, or government authorities.
                  </li>
                  <li>
                    <strong className="text-white">Business Transfers:</strong> In the event of a merger, acquisition, or sale of our business, your data may be transferred to the new entity. You will be notified of any such change.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  7. Data Security
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  We use industry-standard measures to protect your data from unauthorized access or disclosure. While we strive to ensure the highest level of security, no method of transmission or storage is completely secure. We encourage you to take precautions to protect your account credentials.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  8. Data Retention
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  We retain your data only as long as necessary for the purposes outlined in this Privacy Policy. Uploaded content, such as media files used for AI video generation, will be retained temporarily and deleted once the service is fulfilled unless you choose to save projects in your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  9. Your Data Protection Rights (GDPR & Other Regulations)
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Depending on your location, you may have rights regarding your personal data, including:
                </p>
                <ul className="space-y-4 text-gray-300">
                  <li>
                    <strong className="text-white">Access:</strong> Request a copy of the data we hold about you.
                  </li>
                  <li>
                    <strong className="text-white">Correction:</strong> Request corrections to inaccurate or incomplete data.
                  </li>
                  <li>
                    <strong className="text-white">Deletion:</strong> Request deletion of your personal data, where applicable.
                  </li>
                  <li>
                    <strong className="text-white">Restriction:</strong> Request restrictions on the processing of your data.
                  </li>
                  <li>
                    <strong className="text-white">Portability:</strong> Request that we transfer your data to another service or directly to you.
                  </li>
                </ul>
                <p className="text-gray-300 leading-relaxed mt-4">
                  To exercise these rights, please contact us at the email provided below.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  10. Cookies and Tracking Technologies
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  We use cookies to improve your experience and collect insights on platform usage. These cookies help with authentication, remembering settings, and analyzing performance. You can adjust your browser settings to decline cookies, but some features of our Services may not function properly without them.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  11. Children's Privacy
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  Our AI video generator platform is not intended for children under 13. We do not knowingly collect personal information from children. If we discover that a child's data has been collected without proper consent, we will delete it immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  12. Third-Party Links
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  13. Changes to This Privacy Policy
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  We may update this Privacy Policy as our practices evolve. Changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this policy periodically.
                </p>
              </section>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  14. Contact Us
                </h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  If you have questions or concerns about this Privacy Policy or our data practices, feel free to reach out:
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Email: <a href="mailto:support@vidfab.ai" className="text-purple-400 hover:text-purple-300 transition-colors">support@vidfab.ai</a>
                </p>
                <p className="text-gray-300 leading-relaxed mt-6">
                  Thank you for trusting us with your data as we help you create amazing AI-generated videos!
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
