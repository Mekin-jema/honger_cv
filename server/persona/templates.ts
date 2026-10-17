import "server-only";
import type { PersonaDocInput } from "@/lib/persona/schema";

/**
 * Starting points for a new persona in the admin. The marriage template follows a Bangladeshi
 * biodata's usual sections, with the visibility each item usually gets; every value is left empty for
 * the owner to fill in (empty items are ignored by the chat and the AI until they have a value).
 */

export function blankPersona(name: string, displayName = "Your Name"): PersonaDocInput {
  return {
    v: 1,
    name,
    identity: { name: displayName, shortName: displayName.split(" ")[0] || displayName, initials: displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "ME" },
    site: { indexable: false, defaultLang: "en", languages: ["en"] },
    hero: { staticIntro: `Hi, I'm ${displayName}.`, pools: [{ id: "hello", lines: [`Hi, I'm ${displayName}.`] }], schedule: [] },
    sections: [{ key: "about", title: "About me", display: "paragraphs", visibility: "public", items: [{ id: "intro", text: "" }] }],
    questions: [{ id: "about", label: "About me", prompt: "Who are you?", icon: "user", primary: true, keywords: ["about", "who"], answers: ["A few words about me:"], blocks: [{ kind: "section", key: "about" }] }],
    landing: ["about"],
    sidebar: [{ title: "Ask about", questionIds: ["about"], icons: true }],
    fallback: { answers: ["That's outside what this chat covers. Try one of these:"] },
  };
}

const fact = (id: string, label: string, bn: string, visibility?: "unlocked" | "private") => ({ id, label: { en: label, bn }, value: "", ...(visibility ? { visibility } : {}) });

/** The marriage biodata persona (plan section 3.4). Names and known facts come from the job persona. */
export function marriagePersona(): PersonaDocInput {
  return {
    v: 1,
    name: "Marriage",
    identity: {
      name: "Md Maruf Billah",
      shortName: "Maruf",
      initials: "MB",
      givenName: "Maruf",
      familyName: "Billah",
      role: { en: "Lead Software Engineer", bn: "লিড সফটওয়্যার ইঞ্জিনিয়ার" },
      location: { en: "Dhaka, Bangladesh", bn: "ঢাকা, বাংলাদেশ" },
      avatar: { src: "/images/md-maruf-billah-avatar.webp", alt: "" },
      photos: [{ src: "/images/md-maruf-billah.webp", width: 1350, height: 1800, alt: { en: "Md Maruf Billah", bn: "মোঃ মারুফ বিল্লাহ" }, visibility: "unlocked" }],
    },
    site: {
      indexable: true,
      defaultLang: "en",
      languages: ["en", "bn"],
      title: { en: "Md Maruf Billah - Marriage biodata", bn: "মোঃ মারুফ বিল্লাহ - বিয়ের বায়োডাটা" },
      description: {
        en: "Marriage biodata of Md Maruf Billah, a Lead Software Engineer from Dhaka, Bangladesh. Ask about education, career, family, values and what I am looking for.",
        bn: "মোঃ মারুফ বিল্লাহর বিয়ের বায়োডাটা - ঢাকার একজন লিড সফটওয়্যার ইঞ্জিনিয়ার। পড়াশোনা, পেশা, পরিবার, মূল্যবোধ ও প্রত্যাশা সম্পর্কে জিজ্ঞেস করুন।",
      },
      keywords: ["groom biodata", "marriage biodata", "software engineer groom Dhaka", "পাত্র", "বিয়ের বায়োডাটা", "সফটওয়্যার ইঞ্জিনিয়ার পাত্র"],
    },
    labels: {
      composerPlaceholder: { en: "Ask about me, my family, my values…", bn: "আমার, আমার পরিবার বা মূল্যবোধ সম্পর্কে জিজ্ঞেস করুন…" },
      composerPlaceholderAi: { en: "Ask me anything a family would like to know…", bn: "পরিবারের জানতে চাওয়া যেকোনো প্রশ্ন করুন…" },
      askHint: { en: "The AI answers from my biodata", bn: "আমার বায়োডাটা থেকে AI উত্তর দেয়" },
      askHintNoMatch: { en: "No ready-made answer for that - the AI answers from my biodata", bn: "এর জন্য লেখা উত্তর নেই - আমার বায়োডাটা থেকে AI উত্তর দেয়" },
      thinking: { en: "Reading my biodata...", bn: "বায়োডাটা দেখছি..." },
      thinkingStatus: { en: "Reading my biodata", bn: "বায়োডাটা দেখছি" },
      aiDisclaimer: { en: "Answered by AI from my biodata - it can be imperfect.", bn: "আমার বায়োডাটা থেকে AI এই উত্তর লিখেছে - ভুল থাকতে পারে।" },
      footerAi: { en: "Listed answers are written by me; anything else is answered by AI, from my biodata only.", bn: "তালিকার উত্তরগুলো আমার নিজের লেখা; বাকি প্রশ্নের উত্তর AI দেয়, শুধু আমার বায়োডাটা থেকে।" },
      footerNoAi: { en: "Every answer here is written by me.", bn: "এখানকার প্রতিটি উত্তর আমার নিজের লেখা।" },
      documentButton: { en: "Biodata", bn: "বায়োডাটা" },
      documentDownload: { en: "Download biodata", bn: "বায়োডাটা ডাউনলোড" },
      availability: { en: "Looking for [a ]life partner", bn: "জীবনসঙ্গী [খুঁজছি]" },
      availabilityTitle: { en: "How to get in touch with my family", bn: "আমার পরিবারের সাথে যোগাযোগ" },
      gatedText: {
        en: "My family shares that part privately. If you have an access code, enter it below - or send a request and we'll get back to you.",
        bn: "এই অংশটি আমার পরিবার ব্যক্তিগতভাবে শেয়ার করে। আপনার কাছে অ্যাক্সেস কোড থাকলে নিচে লিখুন - অথবা অনুরোধ পাঠান, আমরা যোগাযোগ করব।",
      },
    },
    hero: {
      staticIntro: { en: "Assalamu alaikum, I'm Maruf. I'm a Lead Software Engineer in Dhaka. I'm looking for a life partner, insha'Allah.", bn: "আসসালামু আলাইকুম, আমি মারুফ। আমি ঢাকায় একজন লিড সফটওয়্যার ইঞ্জিনিয়ার। ইনশাআল্লাহ, জীবনসঙ্গী খুঁজছি।" },
      pools: [
        { id: "hello", lines: [{ en: "Assalamu alaikum, I'm Maruf.", bn: "আসসালামু আলাইকুম, আমি মারুফ।" }] },
        { id: "about", lines: [{ en: "I'm a Lead Software Engineer in Dhaka.", bn: "আমি ঢাকায় একজন লিড সফটওয়্যার ইঞ্জিনিয়ার।" }] },
        { id: "looking", lines: [{ en: "I'm looking for a life partner, insha'Allah.", bn: "ইনশাআল্লাহ, জীবনসঙ্গী খুঁজছি।" }] },
      ],
      schedule: [],
    },
    sections: [
      {
        key: "personal",
        title: { en: "Personal information", bn: "ব্যক্তিগত তথ্য" },
        display: "facts",
        visibility: "public",
        inSite: true,
        items: [
          fact("full-name", "Full name", "পূর্ণ নাম"),
          fact("age", "Age", "বয়স"),
          fact("date-of-birth", "Date of birth", "জন্ম তারিখ", "unlocked"),
          fact("height", "Height", "উচ্চতা"),
          fact("weight", "Weight", "ওজন"),
          fact("blood-group", "Blood group", "রক্তের গ্রুপ"),
          fact("complexion", "Complexion", "গাত্রবর্ণ"),
          fact("marital-status", "Marital status", "বৈবাহিক অবস্থা"),
          fact("religion", "Religion", "ধর্ম"),
          fact("present-area", "Lives in", "বর্তমান এলাকা"),
          fact("present-address", "Present address", "বর্তমান ঠিকানা", "unlocked"),
          fact("home-district", "Home district", "নিজ জেলা"),
          fact("languages", "Languages", "ভাষা"),
        ],
      },
      {
        key: "faith",
        title: { en: "Faith & lifestyle", bn: "ধর্মচর্চা ও জীবনযাপন" },
        display: "facts",
        visibility: "public",
        inSite: true,
        items: [fact("prayer", "Prayer", "নামাজ"), fact("fasting", "Fasting", "রোজা"), fact("lifestyle", "Daily life", "দৈনন্দিন জীবন"), fact("hobbies", "Hobbies", "শখ"), fact("smoking", "Smoking", "ধূমপান")],
      },
      { key: "about-me", title: { en: "About me", bn: "আমার সম্পর্কে" }, display: "paragraphs", visibility: "public", inSite: true, items: [{ id: "intro", text: "" }] },
      {
        key: "education",
        title: { en: "Education", bn: "শিক্ষাগত যোগ্যতা" },
        display: "timeline",
        visibility: "public",
        inSite: true,
        items: [
          { id: "bsc", label: { en: "BSc in Computer Science and Engineering", bn: "কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিংয়ে বিএসসি" }, meta: { en: "North South University, Dhaka", bn: "নর্থ সাউথ ইউনিভার্সিটি, ঢাকা" }, period: "2021" },
          { id: "hsc", label: "HSC", meta: "", period: "" },
          { id: "ssc", label: "SSC", meta: "", period: "" },
        ],
      },
      {
        key: "career",
        title: { en: "Career", bn: "পেশা" },
        display: "facts",
        visibility: "public",
        inSite: true,
        items: [
          { id: "profession", label: { en: "Profession", bn: "পেশা" }, value: { en: "Lead Software Engineer, leading a team of 10 engineers", bn: "লিড সফটওয়্যার ইঞ্জিনিয়ার, ১০ জনের একটি টিমের দলনেতা" } },
          { id: "employer", label: { en: "Employer", bn: "প্রতিষ্ঠান" }, value: "Echologyx Ltd, Dhaka" },
          { id: "experience", label: { en: "Experience", bn: "অভিজ্ঞতা" }, value: { en: "5+ years building software for clients in Europe", bn: "ইউরোপের ক্লায়েন্টদের জন্য ৫+ বছরের সফটওয়্যার তৈরির অভিজ্ঞতা" } },
          fact("income", "Monthly income", "মাসিক আয়", "unlocked"),
          fact("plans", "Plans (abroad, relocation)", "ভবিষ্যৎ পরিকল্পনা"),
        ],
      },
      {
        key: "family",
        title: { en: "Family", bn: "পারিবারিক তথ্য" },
        display: "facts",
        visibility: "public",
        inSite: true,
        items: [
          fact("father-profession", "Father's profession", "বাবার পেশা"),
          fact("mother-profession", "Mother's profession", "মায়ের পেশা"),
          fact("siblings", "Siblings", "ভাই-বোন"),
          fact("family-type", "Family type", "পরিবারের ধরন"),
          fact("father-name", "Father's name", "বাবার নাম", "unlocked"),
          fact("mother-name", "Mother's name", "মায়ের নাম", "unlocked"),
          fact("siblings-details", "Siblings in detail", "ভাই-বোনের বিস্তারিত", "unlocked"),
        ],
      },
      {
        key: "looking-for",
        title: { en: "What I'm looking for", bn: "যেমন জীবনসঙ্গী চাই" },
        display: "facts",
        visibility: "public",
        inSite: true,
        items: [fact("age-range", "Age", "বয়স"), fact("education", "Education", "শিক্ষা"), fact("practice", "Religious practice", "ধর্মচর্চা"), fact("location", "Location", "এলাকা"), fact("other", "Also important to me", "যা গুরুত্বপূর্ণ")],
      },
      { key: "photos", title: { en: "Photos", bn: "ছবি" }, display: "gallery", visibility: "unlocked", inDocument: false, items: [] },
      {
        key: "contact",
        title: { en: "Contact (guardian)", bn: "যোগাযোগ (অভিভাবক)" },
        display: "facts",
        visibility: "unlocked",
        items: [fact("guardian", "Guardian", "অভিভাবক"), fact("guardian-phone", "Guardian's phone", "অভিভাবকের ফোন"), fact("my-phone", "My phone", "আমার ফোন"), fact("email", "Email", "ইমেইল"), fact("best-time", "Best time to call", "ফোন করার ভালো সময়")],
      },
      { key: "notes", title: { en: "Private notes", bn: "ব্যক্তিগত নোট" }, display: "list", visibility: "private", inChat: false, inDocument: false, items: [] },
    ],
    questions: [
      { id: "about", label: { en: "About me", bn: "আমার সম্পর্কে" }, prompt: { en: "Tell me about yourself.", bn: "আপনার সম্পর্কে বলুন।" }, icon: "user", primary: true, keywords: ["about", "who", "yourself", "পরিচয়", "সম্পর্কে"], answers: [{ en: "Here is a short introduction:", bn: "সংক্ষেপে আমার পরিচয়:" }], blocks: [{ kind: "section", key: "about-me" }, { kind: "section", key: "personal" }], followUps: ["family", "career", "looking-for"] },
      { id: "family", label: { en: "Family", bn: "পরিবার" }, prompt: { en: "Tell me about your family.", bn: "আপনার পরিবার সম্পর্কে বলুন।" }, icon: "users", primary: true, keywords: ["family", "parents", "father", "mother", "siblings", "পরিবার", "বাবা", "মা", "ভাই", "বোন"], answers: [{ en: "My family:", bn: "আমার পরিবার:" }], blocks: [{ kind: "section", key: "family" }], followUps: ["about", "contact", "looking-for"] },
      { id: "career", label: { en: "Education & career", bn: "পড়াশোনা ও পেশা" }, prompt: { en: "What do you study and do for work?", bn: "আপনার পড়াশোনা ও পেশা কী?" }, icon: "graduation-cap", primary: true, keywords: ["education", "study", "university", "job", "work", "career", "income", "পড়াশোনা", "চাকরি", "পেশা"], answers: [{ en: "My education and work:", bn: "আমার পড়াশোনা ও পেশা:" }], blocks: [{ kind: "section", key: "education" }, { kind: "section", key: "career" }], followUps: ["about", "faith", "looking-for"] },
      { id: "faith", label: { en: "Faith & lifestyle", bn: "ধর্মচর্চা ও জীবনযাপন" }, prompt: { en: "How do you practise your faith, and how do you live day to day?", bn: "আপনার ধর্মচর্চা ও দৈনন্দিন জীবন কেমন?" }, icon: "moon", primary: true, keywords: ["faith", "religion", "prayer", "namaz", "salah", "lifestyle", "hobby", "নামাজ", "ধর্ম", "শখ"], answers: [{ en: "My faith and daily life:", bn: "আমার ধর্মচর্চা ও দৈনন্দিন জীবন:" }], blocks: [{ kind: "section", key: "faith" }], followUps: ["looking-for", "family", "about"] },
      { id: "looking-for", label: { en: "What I'm looking for", bn: "যেমন জীবনসঙ্গী চাই" }, prompt: { en: "What are you looking for in a partner?", bn: "কেমন জীবনসঙ্গী চান?" }, icon: "heart", primary: true, keywords: ["partner", "looking", "expect", "expectation", "bride", "wife", "পাত্রী", "প্রত্যাশা", "জীবনসঙ্গী"], answers: [{ en: "What matters to me in a life partner:", bn: "জীবনসঙ্গীর ক্ষেত্রে যা আমার কাছে গুরুত্বপূর্ণ:" }], blocks: [{ kind: "section", key: "looking-for" }], followUps: ["faith", "family", "contact"] },
      { id: "photos", label: { en: "Photos", bn: "ছবি" }, prompt: { en: "Can I see your photos?", bn: "আপনার ছবি দেখা যাবে?" }, icon: "image", primary: true, visibility: "unlocked", keywords: ["photo", "photos", "picture", "ছবি"], answers: [{ en: "A few photos:", bn: "কয়েকটি ছবি:" }], blocks: [{ kind: "section", key: "photos" }], followUps: ["contact", "about"] },
      { id: "biodata", label: { en: "Biodata", bn: "বায়োডাটা" }, prompt: { en: "Can I download your biodata?", bn: "আপনার বায়োডাটা ডাউনলোড করা যাবে?" }, icon: "file-text", primary: true, keywords: ["biodata", "bio", "pdf", "download", "বায়োডাটা"], answers: [{ en: "Here is my biodata:", bn: "এই আমার বায়োডাটা:" }], blocks: [{ kind: "download" }], followUps: ["contact", "family"] },
      { id: "contact", label: { en: "Contact my family", bn: "পরিবারের সাথে যোগাযোগ" }, prompt: { en: "How can we contact your family?", bn: "আপনার পরিবারের সাথে কীভাবে যোগাযোগ করব?" }, icon: "phone", primary: true, keywords: ["contact", "phone", "call", "guardian", "number", "যোগাযোগ", "ফোন", "অভিভাবক"], answers: [{ en: "Families can reach mine like this - or send a request here and we'll get back to you:", bn: "এভাবে আমার পরিবারের সাথে যোগাযোগ করতে পারেন - অথবা এখানে অনুরোধ পাঠান, আমরা যোগাযোগ করব:" }], blocks: [{ kind: "request-access" }], followUps: ["family", "looking-for"] },
      { id: "privacy", label: { en: "Privacy", bn: "গোপনীয়তা" }, prompt: { en: "How do you use my data?", bn: "আমার তথ্য কীভাবে ব্যবহার করেন?" }, icon: "shield-check", keywords: ["privacy", "data", "cookies", "গোপনীয়তা"], answers: [{ en: "Simply and honestly. Here's exactly what this site keeps, and you can change your choice any time:", bn: "সহজ ও সৎভাবে। এই সাইট যা রাখে তা এখানে দেখুন, আর যেকোনো সময় আপনার পছন্দ বদলাতে পারেন:" }], blocks: [{ kind: "privacy" }], followUps: ["about", "contact"] },
    ],
    fallback: { answers: [{ en: "That's outside what I've shared here. Try one of these:", bn: "এ বিষয়ে এখানে কিছু লেখা নেই। এগুলো দেখুন:" }] },
    landing: ["about", "family", "career", "looking-for", "contact"],
    sidebar: [{ title: { en: "Ask about", bn: "জিজ্ঞেস করুন" }, questionIds: ["about", "family", "career", "faith", "looking-for", "photos", "biodata", "contact"], icons: true }],
    defaultFollowUps: ["about", "family", "looking-for"],
    availability: { show: true, action: "contact" },
    rules: {
      voice: { en: "Warm, humble, respectful and honest, like a young man introducing himself to a family. No boasting.", bn: "আন্তরিক, বিনয়ী, শ্রদ্ধাশীল ও সৎ।" },
      audience: "Families and prospective brides looking for a groom",
      boundaries: [
        "Never discuss past relationships, politics or other families; decline politely.",
        "Never share anything about the family beyond the knowledge given; for contact, point to the request form.",
        "If something isn't in the knowledge, say it hasn't been shared here and offer the contact request.",
      ],
      language: "match",
      maxWords: 80,
    },
    document: { kind: "biodata", slug: "biodata", fileName: "Md-Maruf-Billah-Biodata.pdf", title: { en: "Biodata", bn: "বায়োডাটা" }, language: "English & Bangla", showPhoto: true, gated: true, sections: ["personal", "about-me", "education", "career", "family", "faith", "looking-for", "contact"] },
    access: {
      mode: "request",
      requestIntro: { en: "Tell us who you are and how you know us, and my family will get back to you.", bn: "আপনার পরিচয় ও আমাদের কীভাবে চেনেন জানান, আমার পরিবার আপনার সাথে যোগাযোগ করবে।" },
      codeHint: { en: "Have an access code from my family? Enter it here.", bn: "আমার পরিবারের দেওয়া অ্যাক্সেস কোড আছে? এখানে লিখুন।" },
    },
    checks: [
      { q: "Tell me about your family", expect: { route: "topic", intentIdIn: ["family"] } },
      { q: "What is your guardian's phone number?", expect: { route: "gated" } },
      { q: "আপনার উচ্চতা কত?", lang: "bn", expect: { mustNotInclude: ["undefined"] } },
    ],
  };
}
