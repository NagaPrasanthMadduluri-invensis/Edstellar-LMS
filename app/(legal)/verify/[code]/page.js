import { CertificateVerify } from "@/components/shared/certificate-verify";

export const metadata = {
  title: "Verify certificate",
  description:
    "Confirm that a Spectra LMS certificate is genuine — the holder, the training, the issuing organisation and whether it is still valid.",
};

/**
 * Public certificate verification — reached by scanning the QR printed on a
 * certificate (or opening /verify/:code). Server Component shell; the client
 * component fetches the public, unauthenticated verify endpoint. No session,
 * no sidebar (it renders under the plain (legal) shell).
 */
export default async function VerifyCertificatePage({ params }) {
  const { code } = await params;
  return <CertificateVerify code={code} />;
}
