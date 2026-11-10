// Small inline icon set (stroke icons, 24×24). No icon library needed.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 22, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></Icon>
);
export const HistoryIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /><path d="M12 7v5l3 2" /></Icon>
);
export const StatsIcon = (props: IconProps) => (
  <Icon {...props}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></Icon>
);
export const BikeIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="5.5" cy="17" r="3.5" /><circle cx="18.5" cy="17" r="3.5" /><path d="M5.5 17 9 10h6l3.5 7" /><path d="M9 10 7.5 7H5" /><path d="M15 10l-1.5-3H16" /></Icon>
);
export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Icon>
);
export const FuelIcon = (props: IconProps) => (
  <Icon {...props}><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M3 21h12" /><path d="M7 8h4" /><path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" /></Icon>
);
export const ReserveIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Icon>
);
export const OdometerIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3.5 17a9 9 0 1 1 17 0" /><path d="m12 13 4-4" /><circle cx="12" cy="13" r="1" /></Icon>
);
export const PlusIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>
);
export const CheckIcon = (props: IconProps) => (
  <Icon {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
);
export const MenuIcon = (props: IconProps) => (
  <Icon {...props}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></Icon>
);
export const BackIcon = (props: IconProps) => (
  <Icon {...props}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Icon>
);
export const CloseIcon = (props: IconProps) => (
  <Icon {...props}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Icon>
);
export const WrenchIcon = (props: IconProps) => (
  <Icon {...props}><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3-6.5-6.5L6 9l1.7 1.3a4 4 0 0 0 5-5L11 4l2-2Z" /></Icon>
);
export const DocumentIcon = (props: IconProps) => (
  <Icon {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h6" /></Icon>
);
export const WalletIcon = (props: IconProps) => (
  <Icon {...props}><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" /><path d="M21 9h-5a3 3 0 0 0 0 6h5Z" /></Icon>
);
export const BookIcon = (props: IconProps) => (
  <Icon {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></Icon>
);
export const SignOutIcon = (props: IconProps) => (
  <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Icon>
);
export const CloudOffIcon =(props: IconProps) => (
  <Icon {...props}><path d="m2 2 20 20" /><path d="M5.8 8.2A5 5 0 0 0 7 18h10.5" /><path d="M20.4 16.4A4 4 0 0 0 17.5 9h-1A7 7 0 0 0 9.6 5" /></Icon>
);
