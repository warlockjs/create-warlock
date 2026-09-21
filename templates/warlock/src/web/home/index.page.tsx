import type { PageConfig, PageLoader, PageProps } from "@warlock.js/web";
import { getHomeService } from "app/home/services/home.service";
import { isLocaleCode } from "../../shared/locales";
import { ContactSection } from "./components/contact-section";
import { ContentSections } from "./components/content-sections";
import { HeroSection } from "./components/hero-section";
import { HomeFooter } from "./components/home-footer";
import { HomeHeader } from "./components/home-header";
import "./styles/home.css";

export { register } from "./register";

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

type HomePageProps = PageProps<typeof loader>;

export default function HomePage({ data }: HomePageProps) {
  return (
    <main className="warlock-home">
      <HomeHeader />
      <HeroSection statusMessage={data.statusMessage} />
      <ContentSections capabilities={data.capabilities} packages={data.packages} />
      <ContactSection />
      <HomeFooter />
    </main>
  );
}
