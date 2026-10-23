import Link from "next/link";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCT_BY, PRODUCT_NAME } from "@/lib/brand";
import { CURRENT_PRIVACY_VERSION } from "@/lib/consent";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Spectra LMS collects, uses, discloses and protects personal data, and your rights under applicable data-protection law.",
};

/**
 * Public privacy policy. Server Component — static, no session required (the
 * consent screen, the My Data page and the data-request emails link here, and a
 * privacy policy must be readable by anyone).
 *
 * Structured to the standard a data-protection notice follows and written to
 * the laws that govern this deployment: Singapore's PDPA 2012, India's DPDP Act
 * 2023 (the platform is hosted in India), and the EU/UK GDPR where those apply.
 * It is a complete template; each organization should have its DPO/legal team
 * confirm the specifics (retention periods, DPO contact, sub-processors) before
 * publishing it as their binding notice.
 */
export default function PrivacyPolicyPage() {
  return (
    <>
      <Box className="mb-6 text-center">
        <Text as="p" className="text-2xl font-bold leading-none text-ink">
          {PRODUCT_NAME}
        </Text>
        <Text
          as="p"
          className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-text-3"
        >
          {PRODUCT_BY}
        </Text>
      </Box>

      <Card>
        <CardContent className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
          <Box>
            <Text as="h1" className="text-2xl font-bold text-ink">
              Privacy Policy
            </Text>
            <Text as="p" className="mt-1 text-[12px] text-text-3">
              Version {CURRENT_PRIVACY_VERSION} &middot; Effective{" "}
              {CURRENT_PRIVACY_VERSION}
            </Text>
          </Box>

          <Text as="p" className="text-[13px] leading-relaxed text-text-2">
            This notice explains how personal data is collected, used, disclosed
            and protected in {PRODUCT_NAME}, the corporate learning platform
            provided by Edstellar, and the rights available to you. It is written
            to comply with the data-protection laws that apply to this service
            (see section 3).
          </Text>

          <Section title="1. Scope">
            This policy applies to personal data processed through the{" "}
            {PRODUCT_NAME} web application and related services. It covers
            learners, administrators, trainers and managers who use the platform.
          </Section>

          <Section title="2. Who is responsible for your data">
            Your employer or the organization that provisioned your account is
            the <b>data controller</b> (the &ldquo;Data Fiduciary&rdquo; under
            India&apos;s DPDP Act) and decides why your data is processed.
            Edstellar acts as the <b>data processor</b> (&ldquo;Data
            Processor&rdquo;) and processes it on the controller&apos;s
            documented instructions to operate the platform.
          </Section>

          <Section title="3. Laws we comply with">
            Depending on where you and your organization are located, one or more
            of the following apply, and this policy is designed to meet them:
            <List
              items={[
                "Singapore - Personal Data Protection Act 2012 (PDPA) and the PDPC's advisory guidelines.",
                "India - Digital Personal Data Protection Act, 2023 (DPDP Act), and the Information Technology Act, 2000 with the SPDI Rules, 2011.",
                "European Union / United Kingdom - the General Data Protection Regulation (GDPR) and UK GDPR, where EU/UK data subjects are involved.",
              ]}
            />
            Where these laws differ, we apply the standard that gives your data
            the greater protection.
          </Section>

          <Section title="4. Information we collect">
            <List
              items={[
                "Identity & contact: your name, work email, and (where your organization records them) department, job role, location and reporting manager.",
                "Learning activity: course and session enrolments, lesson and assessment progress, scores, learning hours, certificates and badges.",
                "Participation: feedback you submit, community posts and direct messages, and in-app notifications.",
                "Technical & security: sign-in events, session and device information, IP address, and audit logs of significant actions.",
              ]}
            />
            We do not knowingly collect special-category or sensitive personal
            data (such as health, biometrics, or government identifiers) for the
            learning service, and we do not use the National Registration
            Identity Card (NRIC) number or equivalent national IDs.
          </Section>

          <Section title="5. How we collect it">
            Directly from you when you use the platform, from your organization
            when it creates or imports your account, and automatically through
            your use of the service (for example sign-in and progress events).
          </Section>

          <Section title="6. Why we use it, and our legal basis">
            We process personal data to deliver training, track progress and
            completions, issue certificates, report to your organization&apos;s
            administrators and managers, send service notifications, and keep the
            platform secure and accountable. Our lawful bases are, as applicable:{" "}
            <b>consent</b> (PDPA, DPDP Act, GDPR Art. 6(1)(a)); the{" "}
            <b>legitimate interests</b> of your organization in administering
            workplace learning (GDPR Art. 6(1)(f)); and <b>performance of a
            contract</b> and <b>legal obligation</b> where relevant. We do not
            sell your personal data and we do not use it for automated
            decision-making that produces legal effects about you.
          </Section>

          <Section title="7. Consent and withdrawal">
            Where we rely on consent, you give it when you accept this notice on
            first sign-in, and you may withdraw it at any time by contacting your
            organization&apos;s administrator. Withdrawing consent does not affect
            processing already carried out, and may mean you can no longer use the
            service.
          </Section>

          <Section title="8. Who we disclose it to">
            Your learning records are visible to administrators and, where
            applicable, managers within your organization. Session feedback is
            shown to the trainer without your name. We use vetted service
            providers (for example cloud hosting and email delivery) as
            sub-processors under agreements requiring them to protect your data
            and use it only as instructed. We may disclose data where required by
            law or a valid legal request.
          </Section>

          <Section title="9. International data transfers">
            The platform is hosted on secure cloud infrastructure in India (AWS
            Asia Pacific, Mumbai). Where personal data is transferred to or
            accessed from another country, we put appropriate safeguards in place
            - such as contractual clauses and the transfer-limitation
            protections required by the PDPA and GDPR - so it continues to
            receive a comparable standard of protection.
          </Section>

          <Section title="10. How long we keep it">
            We retain personal data for as long as your account is active and as
            long as needed for the purposes in section 6, and to meet your
            organization&apos;s legal, tax and reporting obligations. When it is
            no longer needed it is deleted or anonymised. Your organization sets
            the specific retention periods.
          </Section>

          <Section title="11. How we protect it">
            We use access controls and least-privilege permissions, strict
            tenant isolation, encryption of credentials and sensitive secrets,
            encryption of data in transit, administrator multi-factor
            authentication, and audit logging. No system is perfectly secure, but
            we work to keep your information safe and to respond promptly to any
            incident, including notifying the relevant authority and affected
            individuals where the law requires.
          </Section>

          <Section title="12. Your rights">
            Subject to the law that applies to you, you have the right to:
            <List
              items={[
                "Access - obtain confirmation of, and a copy of, the personal data we hold about you.",
                "Portability - receive your data in a structured, machine-readable format.",
                "Correction - have inaccurate or incomplete data corrected.",
                "Erasure / withdraw consent - request deletion of your data or withdraw consent.",
                "Grievance / complaint - raise a concern and, if unresolved, complain to the relevant authority (for example the PDPC in Singapore, or the Data Protection Board in India).",
              ]}
            />
            You can exercise access and portability yourself from the{" "}
            <Link
              href="/my-data"
              className="font-medium text-accent-blue underline-offset-2 hover:underline"
            >
              My Data
            </Link>{" "}
            page, and file a correction or deletion request there for an
            administrator to action. We respond to rights requests within the
            timeframe the applicable law requires.
          </Section>

          <Section title="13. Cookies and similar technologies">
            We use a strictly necessary, signed session cookie to keep you
            signed in and secure. We do not use third-party advertising or
            cross-site tracking cookies.
          </Section>

          <Section title="14. Children">
            The platform is intended for workplace learning by adults and is not
            directed at children. We do not knowingly process the data of
            children except where an organization does so lawfully with the
            consent required by the DPDP Act or other applicable law.
          </Section>

          <Section title="15. Changes to this notice">
            We may update this notice. When the version changes you will be asked
            to review and accept it again the next time you sign in. The current
            version is {CURRENT_PRIVACY_VERSION}.
          </Section>

          <Section title="16. Contact and grievance">
            To exercise your rights, withdraw consent, or raise a grievance,
            contact your organization&apos;s administrator or your employer&apos;s
            Data Protection Officer / grievance officer. For platform matters,
            reach the Edstellar team through your usual contact. Your
            organization will name its specific DPO and grievance contact here.
          </Section>

          <Box className="border-t border-line pt-4">
            <Text as="p" className="text-[11px] text-text-3">
              This is a standard template describing the platform&apos;s actual
              data handling. It is safe to show, but each organization should
              have its Data Protection Officer or legal team confirm the
              specifics (retention periods, sub-processors, DPO contact) before
              adopting it as their binding privacy notice.
            </Text>
          </Box>

          <Box className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="text-[13px] font-medium text-accent-blue underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
            <Link
              href="/my-data"
              className="text-[13px] font-medium text-accent-blue underline-offset-2 hover:underline"
            >
              Go to My Data
            </Link>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}

function Section({ title, children }) {
  return (
    <Box className="space-y-2">
      <Text as="h2" className="text-[15px] font-semibold text-ink">
        {title}
      </Text>
      <Text as="div" className="text-[13px] leading-relaxed text-text-2">
        {children}
      </Text>
    </Box>
  );
}

function List({ items }) {
  return (
    <Box as="ul" className="mt-1.5 list-disc space-y-1 pl-5">
      {items.map((item) => (
        <Text key={item} as="li" className="text-[13px] leading-relaxed text-text-2">
          {item}
        </Text>
      ))}
    </Box>
  );
}
