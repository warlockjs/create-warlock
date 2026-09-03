import { groupedTranslations } from "@mongez/localization";

export function register() {
  groupedTranslations({
    contact: {
      overline: { en: "Live full-stack example", ar: "مثال حي لتطبيق متكامل" },
      title: { en: "Send a typed request.", ar: "أرسل طلبًا مضبوط الأنواع." },
      description: {
        en: "One form. One validated request. One runtime shared by the browser and server.",
        ar: "نموذج واحد. طلب واحد خاضع للتحقق. وبيئة تشغيل واحدة للمتصفح والخادم.",
      },
      toggle: { en: "العربية", ar: "English" },
      name: { en: "Name", ar: "الاسم" },
      namePlaceholder: { en: "Ada Lovelace", ar: "آدا لوفلايس" },
      email: { en: "Email", ar: "البريد الإلكتروني" },
      emailPlaceholder: { en: "ada@example.com", ar: "ada@example.com" },
      message: { en: "Message", ar: "الرسالة" },
      messagePlaceholder: {
        en: "Tell us what you are building...",
        ar: "أخبرنا بما تعمل على بنائه...",
      },
      submit: { en: "Send request", ar: "إرسال الطلب" },
      submitting: { en: "Sending...", ar: "جارٍ الإرسال..." },
      idle: {
        en: "The response from Warlock will appear here.",
        ar: "ستظهر استجابة Warlock هنا.",
      },
    },
  });
}
