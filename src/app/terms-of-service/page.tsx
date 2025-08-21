"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

const translations = {
  en: {
    title: "tuuli Chat - Terms of Service",
    lastUpdated: "Last Updated: 08/21/2025",
    back: "Back",
    welcome:
      'Welcome to tuuli Chat (accessible at chat.tuuli.moe). These Terms of Service ("Terms") govern your use of our AI-powered chat application ("Service") operated by tuuli Chat ("we," "us," or "our").',
    acceptance: {
      title: "1. Acceptance of Terms",
      content:
        "By accessing or using tuuli Chat, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, please do not use our Service.",
    },
    description: {
      title: "2. Description of Service",
      content:
        "tuuli Chat is an AI-powered chat application that uses Google Gemini models to provide conversational AI services. Our Service allows users to engage in conversations with AI models through our web interface.",
    },
    accounts: {
      title: "3. User Accounts and Authentication",
      points: [
        "User authentication is handled through Clerk, a third-party authentication service",
        "You are responsible for maintaining the security of your account credentials",
        "You may delete your account at any time through the account settings",
        "You must provide accurate and complete information when creating an account",
      ],
    },
    usage: {
      title: "4. Usage Limits and Subscription Tiers",
      promoTitle: "Promotional Period Limits:",
      points: [
        "Basic Users: 50 messages per day (25 messages for Gemini 2.5 Pro model)",
        "Premium Users: 500 messages per day (250 messages for Gemini 2.5 Pro model)",
      ],
      note: "Usage limits may change at our discretion. We will provide reasonable notice of any changes to existing users.",
    },
    acceptableUse: {
      title: "5. Acceptable Use Policy",
      intro: "You agree NOT to use the Service to:",
      points: [
        "Violate any applicable laws or regulations",
        "Harass, abuse, or harm others",
        "Generate harmful, illegal, or inappropriate content",
        "Attempt to reverse engineer or exploit our systems",
        "Share false, misleading, or deceptive information",
        "Violate the rights of others, including intellectual property rights",
        "Engage in any activity that could damage or impair the Service",
      ],
    },
    contentData: {
      title: "6. Content and Data",
      points: [
        "You retain ownership of the content you submit to our Service",
        "By using our Service, you grant us a license to process your messages through Google's AI models",
        "We reserve the right to remove content that violates these Terms",
        "You are solely responsible for the content you generate and share",
      ],
    },
    thirdParty: {
      title: "7. Third-Party Services",
      intro: "Our Service integrates with third-party providers:",
      points: [
        "Google Cloud Platform: For AI model processing and cloud services",
        "Clerk: For user authentication and account management",
        "DigitalOcean: For web server hosting (Singapore)",
        "Supabase/AWS: For database services (Singapore)",
      ],
      note: "Your use of these third-party services is subject to their respective terms and policies.",
    },
    availability: {
      title: "8. Service Availability",
      points: [
        "We strive to maintain high availability but do not guarantee uninterrupted service",
        "We may perform maintenance, updates, or modifications that temporarily affect service availability",
        "We are not liable for any damages resulting from service interruptions",
      ],
    },
    liability: {
      title: "9. Limitation of Liability",
      content:
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, TUULI CHAT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.",
    },
    termination: {
      title: "10. Termination",
      points: [
        "You may terminate your account at any time",
        "We may terminate or suspend your access for violations of these Terms",
        "Upon termination, your right to use the Service ceases immediately",
      ],
    },
    changes: {
      title: "11. Changes to Terms",
      content:
        "We reserve the right to modify these Terms at any time. Material changes will be communicated through the Service or via email. Continued use of the Service constitutes acceptance of modified Terms.",
    },
    language: {
      title: "12. Language",
      content:
        "In the event of a conflict between the English version of these Terms and any translation, the English version shall prevail.",
    },
    law: {
      title: "13. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved through appropriate legal channels.",
    },
    contact: {
      title: "14. Contact Information",
      content: "For questions about these Terms, please contact us at",
      email: "hi@tuuli.moe",
    },
  },
  mn: {
    title: "tuuli Chat - Үйлчилгээний нөхцөл",
    lastUpdated: "Сүүлд шинэчилсэн: 2025/08/21",
    back: "Буцах",
    welcome:
      'tuuli Chat-д тавтай морилно уу (chat.tuuli.moe хаягаар хандах боломжтой). Эдгээр Үйлчилгээний нөхцөл ("Нөхцөл") нь tuuli Chat ("бид", "бидний") ажиллуулдаг хиймэл оюун ухаанд суурилсан чат програм ("Үйлчилгээ")-г ашиглахтай холбоотой харилцааг зохицуулна.',
    acceptance: {
      title: "1. Нөхцөлийг хүлээн зөвшөөрөх",
      content:
        "tuuli Chat-д хандах эсвэл ашигласнаар та эдгээр Нөхцөл болон манай Нууцлалын бодлогыг дагаж мөрдөхөө хүлээн зөвшөөрч байна. Хэрэв та эдгээр Нөхцөлийг зөвшөөрөхгүй бол манай Үйлчилгээг ашиглахгүй байхыг хүсье.",
    },
    description: {
      title: "2. Үйлчилгээний тодорхойлолт",
      content:
        "tuuli Chat нь Google Gemini загваруудыг ашиглан хиймэл оюун ухааны харилцан ярианы үйлчилгээ үзүүлдэг програм юм. Манай үйлчилгээ нь хэрэглэгчдэд вэб интерфейсээр дамжуулан хиймэл оюун ухааны загваруудтай харилцах боломжийг олгодог.",
    },
    accounts: {
      title: "3. Хэрэглэгчийн бүртгэл ба нэвтрэлт",
      points: [
        "Хэрэглэгчийн нэвтрэлтийг гуравдагч талын нэвтрэлтийн үйлчилгээ болох Clerk-ээр гүйцэтгэдэг",
        "Та бүртгэлийнхээ нууц үгийн аюулгүй байдлыг хангах үүрэгтэй",
        "Та хүссэн үедээ бүртгэлийн тохиргоогоор дамжуулан бүртгэлээ устгах боломжтой",
        "Бүртгэл үүсгэхдээ үнэн зөв, бүрэн мэдээлэл өгөх ёстой",
      ],
    },
    usage: {
      title: "4. Ашиглалтын хязгаар ба багцын ангилал",
      promoTitle: "Урамшууллын хугацааны хязгаар:",
      points: [
        "'Basic' хэрэглэгчид: Өдөрт 50 мессеж (Gemini 2.5 Pro модел 25 мессеж)",
        "'Premium' хэрэглэгчид: Өдөрт 500 мессеж (Gemini 2.5 Pro модел 250 мессеж)",
      ],
      note: "Ашиглалтын хязгаар бидний хэзээ ч өөрчлөгдөж болно. Одоо байгаа хэрэглэгчдэд аливаа өөрчлөлтийн талаар мэдэгдэх болно.",
    },
    acceptableUse: {
      title: "5. Зүй зохистой ашиглалтын бодлого",
      intro: "Та Үйлчилгээг дараах зорилгоор ашиглахгүй байхыг зөвшөөрч байна:",
      points: [
        "Холбогдох хууль тогтоомжийг зөрчих",
        "Бусдыг дарамтлах, доромжлох, хохироох",
        "Хохиролтой, хууль бус, зохисгүй агуулга үүсгэх",
        "Манай системийг урвуулан инженерчлэх, ашиглахыг оролдох",
        "Худал, төөрөгдүүлсэн, хуурамч мэдээлэл хуваалцах",
        "Оюуны өмчийн эрхийг оролцуулан бусдын эрхийг зөрчих",
        "Үйлчилгээнд хохирол учруулж, гэмтээж болзошгүй аливаа үйл ажиллагаа явуулах",
      ],
    },
    contentData: {
      title: "6. Агуулга ба өгөгдөл",
      points: [
        "Та манай Үйлчилгээнд оруулсан агуулгынхаа өмчлөлийг хадгална",
        "Манай Үйлчилгээг ашигласнаар та бидэнд мессежийг тань Google-ийн хиймэл оюун ухааны загвараар боловсруулах лиценз олгож байна",
        "Эдгээр Нөхцөлийг зөрчсөн агуулгыг устгах эрхийг бид хадгална",
        "Та өөрийн үүсгэсэн болон хуваалцсан агуулгад дангаараа хариуцлага хүлээнэ",
      ],
    },
    thirdParty: {
      title: "7. Гуравдагч талын үйлчилгээ",
      intro:
        "Манай Үйлчилгээ нь гуравдагч талын үйлчилгээ үзүүлэгчидтэй нэгддэг:",
      points: [
        "Google Cloud Platform: Хиймэл оюун ухааны загвар боловсруулах болон үүлэн үйлчилгээнд",
        "Clerk: Хэрэглэгчийн нэвтрэлт ба бүртгэлийн удирдлагад",
        "DigitalOcean: Вэб серверийн хостинг (Сингапур)",
        "Supabase/AWS: Мэдээллийн сангийн үйлчилгээнд (Сингапур)",
      ],
      note: "Эдгээр гуравдагч талын үйлчилгээг ашиглах нь тэдний тус тусын нөхцөл, бодлогод хамаарна.",
    },
    availability: {
      title: "8. Үйлчилгээний хүртээмж",
      points: [
        "Бид өндөр хүртээмжийг хангахыг хичээдэг боловч тасралтгүй үйлчилгээг баталгаажуулахгүй",
        "Бид үйлчилгээний хүртээмжид түр нөлөөлж болзошгүй засвар үйлчилгээ, шинэчлэлт, өөрчлөлт хийж болно",
        "Үйлчилгээний тасалдлаас үүдэлтэй аливаа хохирлыг бид хариуцахгүй",
      ],
    },
    liability: {
      title: "9. Хариуцлагын хязгаарлалт",
      content:
        "ХУУЛИАР ЗӨВШӨӨРСӨН ХЭМЖЭЭНД, TUULI CHAT НЬ ШУУД БУС, САНАМСАРГҮЙ, ОНЦГОЙ, ҮР ДАГАВАРЫН, ЭСВЭЛ ШИЙТГЭЛИЙН ХОХИРОЛ, ЭСВЭЛ АШИГ, ОРЛОГЫН АЛДАГДАЛД ХАРИУЦЛАГА ХҮЛЭЭХГҮЙ.",
    },
    termination: {
      title: "10. Цуцлалт",
      points: [
        "Та хүссэн үедээ бүртгэлээ цуцлах боломжтой",
        "Эдгээр нөхцөлийг зөрчсөн тохиолдолд бид таны хандалтыг цуцалж, түдгэлзүүлж болно",
      ],
    },
    changes: {
      title: "11. Нөхцөлд оруулах өөрчлөлт",
      content:
        "Бид эдгээр нөхцөлийг хүссэн үедээ өөрчлөх эрхтэй. Үйлчилгээг үргэлжлүүлэн ашиглах нь өөрчлөгдсөн нөхцөлийг хүлээн зөвшөөрсөнд тооцно.",
    },
    language: {
      title: "12. Хэл",
      content:
        "Эдгээр Нөхцлийн англи хувилбар болон орчуулгын хооронд зөрчилдөөн гарсан тохиолдолд англи хувилбарыг баримтална.",
    },
    law: {
      title: "13. Удирдах хууль",
      content:
        "Эдгээр нөхцөл нь холбогдох хууль тогтоомжийн дагуу зохицуулагдаж, тайлбарлагдана. Аливаа маргааныг зохих хууль эрх зүйн сувгаар шийдвэрлэнэ.",
    },
    contact: {
      title: "14. Холбоо барих мэдээлэл",
      content:
        "Эдгээр нөхцлийн талаар асуух зүйл байвал бидэнтэй дараах цахим хаягаар холбоо барина уу",
      email: "hi@tuuli.moe",
    },
  },
};

export default function TermsOfServicePage() {
  const [language, setLanguage] = useState<"en" | "mn">("en");
  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "mn" : "en");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Header with back button */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center text-btn-primary hover:text-btn-primary-hover transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            {t.back}
          </Link>
          <button
            onClick={toggleLanguage}
            className="px-3 py-1 text-sm rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            {language === "en" ? "MN" : "EN"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 md:p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">{t.title}</h1>
            <p className="text-gray-400">{t.lastUpdated}</p>
          </header>

          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-6">{t.welcome}</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.acceptance.title}
              </h2>
              <p className="text-gray-300">{t.acceptance.content}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.description.title}
              </h2>
              <p className="text-gray-300">{t.description.content}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.accounts.title}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {t.accounts.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.usage.title}
              </h2>
              <h3 className="text-lg font-medium text-gray-200 mb-3">
                {t.usage.promoTitle}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                {t.usage.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
              <p className="text-gray-300">{t.usage.note}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.acceptableUse.title}
              </h2>
              <p className="text-gray-300 mb-4">{t.acceptableUse.intro}</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {t.acceptableUse.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.contentData.title}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {t.contentData.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.thirdParty.title}
              </h2>
              <p className="text-gray-300 mb-4">{t.thirdParty.intro}</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                {t.thirdParty.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
              <p className="text-gray-300">{t.thirdParty.note}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.availability.title}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {t.availability.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.liability.title}
              </h2>
              <p className="text-gray-300 font-medium">{t.liability.content}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.termination.title}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {t.termination.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.changes.title}
              </h2>
              <p className="text-gray-300">{t.changes.content}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.language.title}
              </h2>
              <p className="text-gray-300">{t.language.content}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.law.title}
              </h2>
              <p className="text-gray-300">{t.law.content}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {t.contact.title}
              </h2>
              <p className="text-gray-300">
                {t.contact.content}
                <a
                  href={`mailto:${t.contact.email}`}
                  className="ml-1 underline"
                >
                  {t.contact.email}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
