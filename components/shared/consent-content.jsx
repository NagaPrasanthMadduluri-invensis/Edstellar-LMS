"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRODUCT_BY, PRODUCT_NAME } from "@/lib/brand";
import { CURRENT_PRIVACY_VERSION, PRIVACY_POLICY_URL } from "@/lib/consent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import {
  getEmailPreferences,
  recordConsent,
  updateEmailPreferences,
} from "@/services/api/auth";
import { fetchMyProfile, updateMyProfile } from "@/services/api/profile-api";

/**
 * Privacy notice and choices (0057, rewritten with 0065).
 *
 * This is an ACKNOWLEDGEMENT, not a request for consent to the core training.
 * The employer runs workplace learning on its own lawful basis (employment
 * purposes / legitimate use / legitimate interests), so making the person
 * "agree" to it would be bundled consent that is not freely given, and a
 * withdrawal would stop their training. What the person genuinely chooses is
 * shown as separate switches, saved through their own routes (which write the
 * consent log themselves), and snapshotted beside the acknowledgement.
 *
 * The wording mirrors `/privacy` section by section. Change both, and raise
 * CURRENT_PRIVACY_VERSION (server and client) only after legal sign-off, which
 * re-shows this screen to everyone.
 */
export function ConsentContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [recognitionEmails, setRecognitionEmails] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([fetchMyProfile(), getEmailPreferences()]).then(
      ([p, e]) => {
        if (!alive) return;
        const prof = p.status === "fulfilled" ? p.value?.profile ?? null : null;
        const prefs =
          e.status === "fulfilled" ? e.value?.preferences ?? null : null;
        setProfile(prof);
        setEmailPrefs(prefs);
        if (prof) setLeaderboardVisible(!prof.leaderboard_hidden);
        if (prefs) {
          setRecognitionEmails(
            !prefs.all_off && !(prefs.groups_off ?? []).includes("recognition"),
          );
        }
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const orgName = profile?.organization_name || "your organization";
  const isLearner = profile?.role === "learner";
  // With every email off, a recognition switch would be a control that does
  // nothing; the person changes the master switch in My Profile instead.
  const showEmailChoice = isLearner && emailPrefs && !emailPrefs.all_off;

  const acknowledge = async () => {
    setError("");
    setSaving(true);
    try {
      const choices = {};
      if (isLearner && profile) {
        if (leaderboardVisible === !!profile.leaderboard_hidden) {
          await updateMyProfile({
            data: { leaderboard_hidden: !leaderboardVisible },
          });
        }
        choices.leaderboard_visible = leaderboardVisible;
      }
      if (showEmailChoice) {
        const off = new Set(emailPrefs.groups_off ?? []);
        const wasOn = !off.has("recognition");
        if (wasOn !== recognitionEmails) {
          if (recognitionEmails) off.delete("recognition");
          else off.add("recognition");
          await updateEmailPreferences({ groupsOff: [...off] });
        }
        choices.recognition_emails = recognitionEmails;
      }
      await recordConsent(choices);
      window.location.assign("/");
    } catch (err) {
      setError(err.message || "Could not save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle>
          <Text as="h1" className="text-2xl leading-none">{PRODUCT_NAME}</Text>
          <Text
            as="p"
            className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-text-3"
          >
            {PRODUCT_BY}
          </Text>
        </CardTitle>
        <Text as="p" className="text-sm text-muted-foreground">
          Privacy notice and your choices
        </Text>
      </CardHeader>
      <CardContent className="space-y-4">
        <Box className="max-h-[46vh] space-y-3 overflow-y-auto border border-line bg-surface-2 px-4 py-3">
          <Block title="Who is responsible">
            {loading ? "Your organization" : capitalise(orgName)} provides
            this learning platform to you and decides how your data is used. It
            is the data controller. Edstellar runs {PRODUCT_NAME} for it as a
            data processor and uses your data only on its instructions.
          </Block>
          <Block title="What is held">
            Your name, work email, department, job role, location and manager
            as your organization records them; your course enrolments, lesson
            and assessment progress, scores, learning hours, certificates,
            badges and points; feedback, community posts and messages you
            write; and sign-in, security and last-active records.
          </Block>
          <Block title="Why, and on what basis">
            To deliver and track your workplace training, issue certificates,
            report progress to your administrators and manager, and keep the
            service secure. Your organization does this as part of running
            workplace learning (employment purposes, legitimate use or
            legitimate interests, depending on the law that applies), so it
            does not depend on your consent. The optional choices below are
            yours to make. Your data is not sold.
          </Block>
          <Block title="Who can see it">
            Your administrators and, where recorded, your manager see your
            learning record. Trainers see attendance for their sessions.
            Colleagues see your first name and last initial on community posts
            and reviews, and on the leaderboard unless you switch it off below.
            Edstellar support may view your organization&apos;s data in a
            time-limited, logged support session.
          </Block>
          <Block title="Where it is stored">
            In India (Amazon Web Services, Mumbai). Cloudflare carries every
            request and stores course media, and Google delivers the emails the
            platform sends, so some data may be processed in other countries.
          </Block>
          <Block title="How long it is kept">
            While your account is active. After it is deactivated your personal
            details are anonymised after a set period (12 months by default),
            and sent-email records are deleted after 90 days.
          </Block>
          <Block title="Your rights">
            On the My Data page you can download your data, ask for a
            correction or deletion, and ask to withdraw consent. You can change
            the choices below at any time in My Profile. If you are not
            satisfied with the answer, you can complain to your data protection
            authority (for example the PDPC in Singapore or the Data Protection
            Board of India).
          </Block>
          <Text as="p" className="text-[13px] leading-relaxed text-text-2">
            <Link
              href={PRIVACY_POLICY_URL}
              target="_blank"
              className="font-medium text-accent-blue underline-offset-2 hover:underline"
            >
              Read the full privacy policy
            </Link>
          </Text>
        </Box>

        {isLearner && (
          <Box className="space-y-2">
            <Text as="p" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
              Your choices
            </Text>
            <Choice
              checked={leaderboardVisible}
              disabled={saving}
              onChange={setLeaderboardVisible}
              title="Show me on leaderboards"
              body="Colleagues see your name, points and ranking. When off, you still earn points and badges and your admin still sees your progress."
            />
            {showEmailChoice && (
              <Choice
                checked={recognitionEmails}
                disabled={saving}
                onChange={setRecognitionEmails}
                title="Email me about recognition"
                body="Badges earned, leaderboard rank and kudos from colleagues. Training and account emails are sent either way."
              />
            )}
          </Box>
        )}

        {error && <Text as="p" className="text-sm text-error">{error}</Text>}

        <Button
          onClick={acknowledge}
          disabled={saving || loading}
          className="w-full bg-navy hover:bg-navy-soft text-paper"
        >
          {saving ? "Saving..." : "I have read this notice, continue"}
        </Button>
        <Text as="p" className="text-center text-[11px] text-text-3">
          Notice version {CURRENT_PRIVACY_VERSION}. Your acknowledgement and
          choices are recorded with the date, and you can see them on My Data.
        </Text>
      </CardContent>
    </Card>
  );
}

function Block({ title, children }) {
  return (
    <Box className="space-y-1">
      <Text as="p" className="text-[13px] font-semibold text-ink">{title}</Text>
      <Text as="p" className="text-[13px] leading-relaxed text-text-2">
        {children}
      </Text>
    </Box>
  );
}

function Choice({ checked, disabled, onChange, title, body }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 border border-line bg-surface-2 px-3 py-2.5">
      <input
        type="checkbox"
        className="mt-0.5 size-3.5 cursor-pointer accent-[#3B6FD4]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Box className="min-w-0">
        <Text as="span" className="text-[12.5px] font-semibold text-ink">
          {title}
        </Text>
        <Text as="p" className="text-[11px] leading-relaxed text-text-3">
          {body}
        </Text>
      </Box>
    </label>
  );
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
