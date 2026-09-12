import type { SVGProps } from 'react'

/**
 * Ikonuppsättning som SVG-komponenter.
 * Inbakade i koden — inga externa ikonbibliotek och inga nätverksanrop.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const Icon = ({ size = 18, children, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const IconDashboard = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icon>
)

export const IconInventory = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </Icon>
)

export const IconTire = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 3v5.6M12 15.4V21M3 12h5.6M15.4 12H21" />
  </Icon>
)

export const IconSale = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 6h2l2.6 10.4a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.5L21 9H6" />
    <circle cx="10" cy="20" r="1.2" />
    <circle cx="18" cy="20" r="1.2" />
  </Icon>
)

export const IconHistory = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3 4v4h4" />
    <path d="M12 7.5V12l3 1.8" />
  </Icon>
)

export const IconSettings = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </Icon>
)

export const IconSearch = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Icon>
)

export const IconPlus = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconMinus = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
)

export const IconClose = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
)

export const IconCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d="m20 6-11 11-5-5" />
  </Icon>
)

export const IconWarning = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
)

export const IconInfo = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
)

export const IconTrash = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-.8 13a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9L5 6" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
)

export const IconEdit = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Icon>
)

export const IconDownload = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </Icon>
)

export const IconUpload = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5M12 3v12" />
  </Icon>
)

export const IconBox = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </Icon>
)

export const IconTrend = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Icon>
)

export const IconMoney = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 12h.01M18 12h.01" />
  </Icon>
)

export const IconWallet = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2z" />
    <path d="M17 13h.01" />
  </Icon>
)

export const IconDatabase = (props: IconProps) => (
  <Icon {...props}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
    <path d="M20 12c0 1.7-3.6 3-8 3s-8-1.3-8-3" />
  </Icon>
)

export const IconOffline = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 20h.01" />
    <path d="M5 12.5a10 10 0 0 1 14 0" />
    <path d="M8.5 16a5 5 0 0 1 7 0" />
    <path d="M2 9a15 15 0 0 1 20 0" />
  </Icon>
)

export const IconChevronRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)

export const IconFilter = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </Icon>
)

export const IconImage = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </Icon>
)

export const IconRefresh = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </Icon>
)
