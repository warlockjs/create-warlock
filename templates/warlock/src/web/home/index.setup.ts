import { groupedTranslations } from "@mongez/localization";
import type { PageConfig, PageLoader } from "@warlock.js/web";
import { getHomeService } from "app/home/services/home.service";
import { isLocaleCode } from "../../shared/locales";

type HomeLoaderOptions = Parameters<PageLoader>[0];

export async function loader({ request, response }: HomeLoaderOptions) {
  const locale = request.locale;

  if (!isLocaleCode(locale)) {
    return response.notFound();
  }

  const homeData = await getHomeService();

  return { locale, ...homeData };
}

export const config = {
  route: { path: "/", name: "home" },
  metadata: {
    title: "Warlock.js — Build with uncommon power",
    description:
      "A TypeScript framework for production backends, server-rendered React applications, and AI-native systems.",
  },
} satisfies PageConfig<typeof loader>;

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
