import type { Metadata } from "next";
import Link from "next/link";

import { Bullets, Page, PageHeader, TextSection } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/labels";

export const metadata: Metadata = {
  title: "About · FuelTrack",
  description: "FuelTrack is a fuel gauge for bikes and scooters that don't have one: know how far you can ride before reserve.",
};

export default function AboutPage() {
  return (
    <Page narrow>
      <PageHeader title="About FuelTrack" subtitle="The fuel gauge your bike doesn't have." />

      <TextSection title="What it is">
        <p>
          Many motorcycles and scooters have no fuel gauge, so you find out the tank is low when the engine sputters. FuelTrack
          works out how far you can ride before reserve from three things you already notice: when the bike goes on reserve,
          when you fill up, and the odometer. The more you log, the sharper the estimate.
        </p>
      </TextSection>

      <TextSection title="What it does">
        <Bullets
          items={[
            <><strong>A virtual fuel gauge:</strong> about how many km to reserve, where reserve is expected, and how sure the estimate is.</>,
            <><strong>One-tap On reserve:</strong> no typing at the roadside, and it works without signal.</>,
            <><strong>Real mileage:</strong> from reserve to reserve or full tank to full tank, with cost per km and monthly spend.</>,
            <><strong>Reminders</strong> for low fuel, document expiry (insurance, PUC, RC, licence), service items and a drop in mileage.</>,
            <><strong>A small vehicle manager:</strong> service log, issues and repairs, expenses and the full cost of ownership.</>,
            <><strong>Works like a phone app:</strong> add it to your home screen, with shortcuts for On reserve and Add fuel.</>,
          ]}
        />
      </TextSection>

      <TextSection title="Who makes it">
        <p>
          FuelTrack is a free personal project by Melior Developments, made for riders in India. There are no ads, no tracking and
          no paid features. Your data is used only to run the app: see the <Link href="/privacy" className="underline">Privacy policy</Link>.
        </p>
        <p>
          Questions or ideas: <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
        </p>
      </TextSection>

      <p className="pb-10 text-center text-sm text-muted">
        <Link href="/" className="font-semibold text-foreground underline">Open FuelTrack</Link>
        {" · "}
        <Link href="/privacy" className="underline">Privacy</Link>
      </p>
    </Page>
  );
}
