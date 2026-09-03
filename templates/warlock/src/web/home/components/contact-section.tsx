import { Form } from "@mongez/react-form";
import { useTrans } from "@warlock.js/web";
import { contactSchema } from "../../../shared/contact.schema";
import type { LocaleCode } from "../../../shared/locales";
import { useContactForm } from "../hooks/use-contact-form";
import { useLocaleSwitcher } from "../hooks/use-locale-switcher";
import { ContactField, ContactSubmitButton } from "./contact-form-controls";

type ContactSectionProps = { locale: LocaleCode };

export function ContactSection({ locale }: ContactSectionProps) {
  const { status: contactStatus, submitContact } = useContactForm();
  const { error: localeError, isSwitching, switchLocale } = useLocaleSwitcher();
  const translate = useTrans();
  return (
    <section
      className="warlock-section warlock-contact"
      id="contact"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className="warlock-contact-copy">
        <p className="warlock-overline">{translate("contact.overline")}</p>
        <h2>{translate("contact.title")}</h2>
        <p>{translate("contact.description")}</p>
        <ol className="warlock-contact-flow">
          <li>
            <span>01</span>
            <div>
              <strong>React submits</strong>
              <small>JSON over the same origin</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Seal validates</strong>
              <small>Name, email, and message</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Warlock responds</strong>
              <small>Typed controller, structured JSON</small>
            </div>
          </li>
        </ol>
      </div>
      <Form
        id="contact-demo"
        className="warlock-contact-form"
        schema={contactSchema}
        validateOn="blur"
        focusFirstError
        onSubmit={submitContact}
      >
        <div className="warlock-form-heading">
          <div>
            <small>POST</small>
            <code>/api/contact</code>
          </div>
          <button
            className="warlock-locale-toggle"
            type="button"
            disabled={isSwitching}
            onClick={() => switchLocale(locale === "en" ? "ar" : "en")}
          >
            {translate("contact.toggle")}
          </button>
        </div>
        <ContactField
          name="name"
          type="text"
          label={translate("contact.name")}
          placeholder={translate("contact.namePlaceholder")}
          required
        />
        <ContactField
          name="email"
          type="email"
          label={translate("contact.email")}
          placeholder={translate("contact.emailPlaceholder")}
          required
        />
        <ContactField
          name="message"
          label={translate("contact.message")}
          placeholder={translate("contact.messagePlaceholder")}
          multiline
          rows={5}
          required
        />
        <ContactSubmitButton
          idleLabel={translate("contact.submit")}
          submittingLabel={translate("contact.submitting")}
        />
        <p className={`warlock-form-status is-${contactStatus.state}`} aria-live="polite">
          {contactStatus.message || translate("contact.idle")}
        </p>
        {localeError ? (
          <p className="warlock-form-status is-error" aria-live="polite">
            {localeError}
          </p>
        ) : null}
      </Form>
    </section>
  );
}
