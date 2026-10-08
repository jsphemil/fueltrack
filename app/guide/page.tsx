import Link from "next/link";
import type { ReactNode } from "react";

import { Page, PageHeader } from "@/components/ui";
import { cardClass } from "@/lib/ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cardClass}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-subtle">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function GuidePage() {
  return (
    <Page narrow>
      <PageHeader title="Guide" subtitle="How to get the most out of FuelTrack" />

      <Section title="What FuelTrack does">
        <p>
          Many bikes and scooters have no fuel gauge. FuelTrack works out how far you can ride before reserve from three things you
          already do: switch to reserve, fill up, and glance at the odometer. The more of these you log, the better the estimate.
        </p>
      </Section>

      <Section title="Set up in two minutes">
        <Steps
          items={[
            <>Add your vehicle under <Link href="/vehicles" className="underline">Vehicles</Link> and enter the odometer as it reads now.</>,
            <>If you know your tank size and reserve litres (the owner&apos;s manual has them), add both. This shows a fuel level and how far reserve will take you.</>,
            <>For &ldquo;Fuel right now&rdquo;, <strong>On reserve right now</strong> is the most accurate starting point. <strong>Just filled a full tank</strong> works best if you also entered your tank size. &ldquo;Not sure&rdquo; starts after your next reserve.</>,
          ]}
        />
      </Section>

      <Section title="Your two everyday habits">
        <Steps
          items={[
            <><strong>When the bike goes on reserve, tap On reserve.</strong> It is the button at the bottom of the screen and takes one tap. No typing: add the odometer or trip-meter reading later, when you fill up.</>,
            <><strong>When you fill up, tap Add fuel.</strong> Enter any two of amount, price per litre and litres; the third is worked out. Add the odometer reading and tick <em>Filled to the top</em> only when the tank really is full.</>,
          ]}
        />
      </Section>

      <Section title="How the estimate works">
        <p>
          The distance between two known fuel levels, such as reserve to reserve, and the fuel you added in between give your real mileage in
          km per litre. From the last known level, FuelTrack then counts down using your odometer.
        </p>
        <Steps
          items={[
            <>Until you have completed one cycle (two reserve marks with a fill between), Home says it is still learning.</>,
            <>Confidence rises as cycles build up, and is highest once you have three or more and your odometer is logged rather than estimated.</>,
            <>Between odometer readings, FuelTrack projects distance from your average km per day. A quick odometer entry on Home keeps it exact.</>,
          ]}
        />
      </Section>

      <Section title="Tips for accurate numbers">
        <Steps
          items={[
            <>Tap <strong>On reserve</strong> the moment you switch, not later. It is the anchor everything else is measured from.</>,
            <>Log fills the same day, with the real odometer. If you reset your trip meter at reserve, enter its reading when you fill.</>,
            <>Enter the odometer every few days, even when you do not fill. It takes ten seconds on Home.</>,
            <>Fix mistakes in <Link href="/history" className="underline">History</Link> with Edit or Delete on any entry. Mileage that looks impossible is ignored, not trusted.</>,
          ]}
        />
      </Section>

      <Section title="Reminders">
        <Steps
          items={[
            <>Turn on <strong>Low-fuel reminder</strong> in <Link href="/settings" className="underline">Settings</Link> and allow notifications. You are told once per tank when reserve is closer than the distance you chose.</>,
            <>Add insurance, PUC, RC and licence dates under <Link href="/documents" className="underline">Documents</Link>. Choose how early to be reminded in Settings.</>,
            <>Track oil, chain, filters and more under <Link href="/service" className="underline">Service</Link>, by km, months or both. Note problems as <strong>issues</strong> and clear them by logging a repair.</>,
            <>FuelTrack also tells you when your mileage drops 15% or more below usual, which often means tyre pressure, a dry chain or a dirty air filter.</>,
          ]}
        />
        <p>
          Reminders are shown when you open the app. It cannot notify you while it is closed, so opening it is the check-in.
        </p>
      </Section>

      <Section title="Know what it really costs">
        <Steps
          items={[
            <>Log service and repair costs on the Service page, and everything else (parts, insurance, parking, tolls, washes) under <Link href="/expenses" className="underline">Expenses</Link>.</>,
            <><Link href="/stats" className="underline">Stats</Link> adds fuel, service and expenses into a cost of ownership with an all-in cost per km.</>,
          ]}
        />
      </Section>

      <Section title="On your phone">
        <Steps
          items={[
            <>Add FuelTrack to your home screen (Chrome menu, then Add to Home screen). Long-press the icon for the On reserve and Add fuel shortcuts.</>,
            <>Entries you make without signal are saved on the phone and sent when you are back online.</>,
            <>The app updates itself: open it after a new version and it reloads once.</>,
            <>Customise what Home shows in Settings. Export all your data as CSV there at any time.</>,
          ]}
        />
      </Section>
    </Page>
  );
}
