"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  title?: string
  subtitle?: string
  faqs?: FAQItem[]
  className?: string
  defaultOpenIndex?: number
}

const defaultFAQs: FAQItem[] = [
  {
    question: "How does VidFab AI generate videos automatically?",
    answer:
      "It transforms written prompts or scripts into moving visuals by using powerful AI models. The system interprets your text, generates frames that match your description, and ensures motion consistency.",
  },
  {
    question: "Is VidFab AI Video Generator beginner-friendly?",
    answer:
      "Absolutely! Anyone from a beginner to an expert can create videos on VidFab. You can create explainer videos, marketing videos, promo videos & many more using VidFab.",
  },
  {
    question: "What languages are supported for text input?",
    answer:
      "We currently support multiple languages including English, Japanese, Spanish, and more. Support for additional languages is being added regularly.",
  },
  {
    question: "Do I need to download any software to use VidFab AI video generator?",
    answer:
      "No downloads are needed to generate videos using VidFab. It is a web-based tool, and it works well on all popular browsers such as Safari, Google Chrome, and others on all devices from mobile to desktops.",
  },
  {
    question: "Can I use VidFab for commercial purposes?",
    answer:
      "Yes, our service supports both personal and commercial purposes. However, please make sure that you comply with our terms of use.",
  },
  {
    question: "Can I use VidFab AI Video Generator for Free?",
    answer:
      "Yes. VidFab will provide 50 credits, allowing you to try generating videos initially.",
  },
]

export function FAQSection({
  title = "FAQ",
  subtitle,
  faqs = defaultFAQs,
  className,
  defaultOpenIndex = 0,
}: FAQSectionProps) {
  return (
    <section className={cn("py-14 relative overflow-hidden bg-black", className)}>
      <div className="container mx-auto px-4">
        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl  font-heading font-extrabold mb-4 text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        {/* FAQ Accordion */}
        <div className="mx-auto">
          <Accordion
            type="single"
            collapsible
            defaultValue={`item-${defaultOpenIndex}`}
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={cn(
                  "border-2 border-brand-gray-700 rounded-xl px-6 bg-brand-gray-900/50",
                  "transition-all duration-300",
                  "data-[state=open]:border-brand-purple-DEFAULT data-[state=open]:bg-brand-gray-800/70"
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "text-left hover:no-underline py-6",
                    "text-lg font-semibold text-white",
                    "transition-colors duration-300",
                    "[&[data-state=open]]:text-brand-purple-DEFAULT"
                  )}
                >
                  <span className="pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-300 leading-relaxed pb-6 pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-1/2 -translate-y-1/2 -left-20 w-96 h-96 bg-brand-pink-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -translate-y-1/2 -right-20 w-96 h-96 bg-brand-purple-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}
