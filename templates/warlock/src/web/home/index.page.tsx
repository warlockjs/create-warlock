import type { PageProps } from "@warlock.js/web";
import { ContactSection } from "./components/contact-section";
import { ContentSections } from "./components/content-sections";
import { HeroSection } from "./components/hero-section";
import { HomeFooter } from "./components/home-footer";
import { HomeHeader } from "./components/home-header";
import type { loader } from "./index.setup";

export default function HomePage({ data }: PageProps<typeof loader>) {
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
