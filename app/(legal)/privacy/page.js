import Link from "next/link";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCT_BY, PRODUCT_NAME } from "@/lib/brand";
import { CURRENT_PRIVACY_VERSION } from "@/lib/consent";

export const metadata = {
  title: "Privacy Policy",
  description: "How Spectra LMS collects, uses and protects personal data.",
};

/**
 * Public privacy policy. Server Component — static content, no interactivity,
 * reachable without a session (the consent screen, the My Data page and the
 * data-request emails all link here).
 *
 * The copy is a complete, usable placeholder pending final legal review — it is
 * written to the PDPA shape (what is collected, why, retention, rights,
 * transfers, contact) so it reads as a real notice, not a stub.
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
              Version {CURRENT_PRIVACY_VERSION}. This notice explains how we
              handle personal data in {PRODUCT_NAME}.
            </Text>
          </Box>

          <Section title="1. Who we are">
            {PRODUCT_NAME}, provided by Edstellar, is a corporate learning
            platform. Your employer (the organization that gave you access) is
            the controller of your personal data; Edstellar processes it on
            their behalf to run the service.
          </Section>

          <Section title="2. What we collect">
            <List
              items={[
                "Account details: your name, work email, department, job role and location.",
                "Learning activity: course and session enrolments, lesson and assessment progress, scores, learning hours, certificates and badges.",
                "Participation: feedback you submit, community posts and messages, and notifications.",
                "Security records: sign-in events, device/session information and audit logs of key actions.",
              ]}
            />
          </Section>

          <Section title="3. Why we use it, and our basis">
            We process this data to deliver training, track progress and
            completions, issue certificates, report to your organization&apos;s
            administrators and managers, and keep the service secure and
            accountable. We rely on your consent where it is required, and
            otherwise on the legitimate interests of your employer in
            administering workplace learning. We do not sell your personal data.
          </Section>

          <Section title="4. Who can see it">
            Administrators and, where applicable, managers in your organization
            can see your learning records. Feedback you give on a session is
            shown to the trainer without your name. We use trusted service
            providers (such as hosting and email delivery) under agreements that
            require them to protect your data and use it only as instructed.
          </Section>

          <Section title="5. How long we keep it">
            We keep your personal data for as long as your account is active and
            as long as needed for the purposes above, and to meet your
            organization&apos;s legal and reporting obligations. When it is no
            longer needed it is deleted or anonymised.
          </Section>

          <Section title="6. Where it is stored">
            Your data is hosted on secure cloud infrastructure. Where it is
            stored or processed outside your country, we take steps to ensure it
            receives a comparable standard of protection, including appropriate
            contractual safeguards.
          </Section>

          <Section title="7. Your rights">
            Under applicable data-protection law, including Singapore&apos;s PDPA,
            you may:
            <List
              items={[
                "Access a copy of the personal data we hold about you.",
                "Download your data in a portable, machine-readable format.",
                "Ask us to correct data that is inaccurate or out of date.",
                "Request deletion of your data, or withdraw your consent.",
              ]}
            />
            You can exercise the first two yourself from the{" "}
            <Link href="/my-data" className="font-medium text-accent-blue underline-offset-2 hover:underline">
              My Data
            </Link>{" "}
            page, and file a correction or deletion request there for an
            administrator to action. Withdrawing consent may mean you can no
            longer use the service.
          </Section>

          <Section title="8. Security">
            We protect your data with access controls, encryption of sensitive
            credentials, and administrator multi-factor authentication. No system
            is perfectly secure, but we work to keep your information safe and to
            respond promptly to any incident.
          </Section>

          <Section title="9. Changes to this notice">
            We may update this notice. When the version changes you will be asked
            to review and accept it again the next time you sign in. The current
            version is {CURRENT_PRIVACY_VERSION}.
          </Section>

          <Section title="10. Contact">
            To exercise your rights or ask a question about your data, contact
            your organization&apos;s administrator or your employer&apos;s data
            protection contact. For platform matters, reach the Edstellar team
            through your usual contact.
          </Section>

          <Box className="border-t border-line pt-4">
            <Text as="p" className="text-[11px] text-text-3">
              Placeholder wording pending final legal review. It describes the
              platform&apos;s actual data handling and is safe to show, but the
              binding notice is the one your organization publishes.
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
