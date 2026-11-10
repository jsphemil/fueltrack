import type { Metadata } from "next";
import Link from "next/link";

import { Bullets, Page, PageHeader, TextSection } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Privacy · FuelTrack",
  description: "What FuelTrack stores, why, who can see it, and how to delete it.",
};

const EFFECTIVE_DATE = "10 November 2026";

export default function PrivacyPage() {
  const email = <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>;

  return (
    <Page narrow>
      <PageHeader title="Privacy policy" subtitle={`Effective ${EFFECTIVE_DATE}`} />

      <TextSection title="In short">
        <p>
          FuelTrack stores what you enter so the app can work for you. It shows no ads, uses no tracking or analytics, and never
          sells or shares your data. You can export it, correct it and delete it whenever you like.
        </p>
      </TextSection>

      <TextSection title="What we store">
        <Bullets
          items={[
            <><strong>Your account:</strong> your email address and name (if you add one). Your password is never stored as text: the sign-in service keeps only a one-way scrambled form (a hash) that cannot be turned back into the password.</>,
            <><strong>What you log:</strong> vehicles, fills, reserve marks, odometer readings, notes, service items and visits, issues, expenses, document types with their expiry dates, and your settings.</>,
            <><strong>Technical logs:</strong> like any website, our hosting and sign-in providers record requests (time, IP address, browser or device) to keep the service running and secure. These are kept only briefly.</>,
            <><strong>Error records:</strong> when something fails on our side, we note what failed, when, and your account ID (not what you typed), to fix it. Kept for 30 days.</>,
          ]}
        />
        <p>We do not collect your location, contacts, photos or payment details. The &ldquo;Find nearest petrol pump&rdquo; button simply opens Google Maps; FuelTrack does not see where you are.</p>
      </TextSection>

      <TextSection title="Why we store it">
        <p>Only to provide the app: estimate your range, calculate mileage and costs, and show your reminders. Nothing else.</p>
      </TextSection>

      <TextSection title="Where it is stored">
        <p>
          Your data is kept in a database run by <strong>Supabase</strong> (in Singapore), and the app is served by <strong>Vercel</strong>.
          They process data on our behalf and do not use it for their own purposes. Data travels encrypted (HTTPS).
        </p>
      </TextSection>

      <TextSection title="Who can see it">
        <p>
          You, when signed in. Other users cannot see your data. As the developer, we use an admin page that shows only totals
          and, per account, the email address, sign-up and last sign-in dates, and how many vehicles and entries it has; never the
          entries themselves. We can technically access the database that runs the app, and look at individual data only to fix
          a problem you report or when you ask us to.
        </p>
      </TextSection>

      <TextSection title="Your choices and rights">
        <Bullets
          items={[
            <><strong>See and export:</strong> everything is in the app, and Settings has a CSV export of your entries.</>,
            <><strong>Correct:</strong> edit or delete any entry at any time.</>,
            <><strong>Delete your data:</strong> Settings &rarr; Delete all data removes your vehicles and every entry at once. Your sign-in stays so you can start again.</>,
            <><strong>Delete your account:</strong> Settings &rarr; Delete account removes your sign-in, vehicles and every entry, for good. You can also email {email} from your account&apos;s address and we will do it for you.</>,
          ]}
        />
        <p>These follow the rights in India&apos;s Digital Personal Data Protection Act, 2023: to access, correct and erase your data, and to raise a concern.</p>
      </TextSection>

      <TextSection title="How long we keep it">
        <p>Until you delete it or your account. Deleted data is removed from the live database straight away. Error records are deleted after 30 days.</p>
      </TextSection>

      <TextSection title="Children">
        <p>FuelTrack is meant for adults who ride. It is not directed at children under 18.</p>
      </TextSection>

      <TextSection title="Changes and contact">
        <p>
          If this policy changes, the new version will be posted here with a new date. Questions or concerns: {email}.
        </p>
      </TextSection>

      <p className="pb-10 text-center text-sm text-muted">
        <Link href="/" className="font-semibold text-foreground underline">Open FuelTrack</Link>
        {" · "}
        <Link href="/about" className="underline">About</Link>
      </p>
    </Page>
  );
}
