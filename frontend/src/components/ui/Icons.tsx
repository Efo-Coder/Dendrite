
interface IconProps {
  size?: number
  stroke?: number
  className?: string
}

const Icon = ({ d, size = 16, stroke = 1.4, className }: IconProps & { d: string | string[] }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {Array.isArray(d)
      ? d.map((p, i) => <path key={i} d={p} />)
      : <path d={d} />}
  </svg>
)

export const Icons = {
  pages:     (p: IconProps) => <Icon {...p} d={['M4 2h6l3 3v9H4z', 'M10 2v3h3']} />,
  feather:   (p: IconProps) => <Icon {...p} d={['M2 14 L9 7', 'M9 2c4 0 5 6 0 8L5 10c-1-3 2-8 4-8z']} />,
  briefcase: (p: IconProps) => <Icon {...p} d={['M2 5h12v8H2z', 'M6 5V3.5C6 3 6.3 3 7 3h2c.7 0 1 0 1 .5V5']} />,
  book:      (p: IconProps) => <Icon {...p} d={['M3 2h7c1.5 0 2 .5 2 2v10c0-1-.5-1.5-2-1.5H3z', 'M3 2v10.5']} />,
  fork:      (p: IconProps) => <Icon {...p} d={['M5 2v5c0 1 1 1 1.5 1S8 8 8 7V2', 'M6.5 8v6', 'M11 2v12', 'M11 2c1 0 2 1 2 3v3c0 1-.5 1.5-2 1.5']} />,
  tag:       (p: IconProps) => <Icon {...p} d={['M2 2h6l6 6-6 6-6-6z', 'M5 5h.01']} />,
  trash:     (p: IconProps) => <Icon {...p} d={['M2.5 4h11', 'M6 4V2.5h4V4', 'M3.5 4l1 10h7l1-10', 'M6.5 7v4M9.5 7v4']} />,
  star:      (p: IconProps) => <Icon {...p} d="M8 1.5l2 4.5 5 .5-3.7 3.2 1.2 4.8L8 12l-4.5 2.5L4.7 9.7 1 6.5l5-.5z" />,
  starFill:  (p: IconProps) => (
    <svg width={p?.size ?? 16} height={p?.size ?? 16} viewBox="0 0 16 16" fill="currentColor" className={p?.className}>
      <path d="M8 1.5l2 4.5 5 .5-3.7 3.2 1.2 4.8L8 12l-4.5 2.5L4.7 9.7 1 6.5l5-.5z" />
    </svg>
  ),
  pin:       (p: IconProps) => <Icon {...p} d={['M9.5 2.5L13.5 6.5', 'M11.5 1.5L14.5 4.5', 'M5 9L1 13', 'M6 7l3-3 3 3-1 1-2-1-3 3-2-2 3-3z']} />,
  pinFill:   (p: IconProps) => (
    <svg width={p?.size ?? 16} height={p?.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p?.className}>
      <path d="M12 17v5"/>
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" fill="currentColor"/>
    </svg>
  ),
  search:    (p: IconProps) => <Icon {...p} d={['M11 11l3.5 3.5', 'M11 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z']} />,
  plus:      (p: IconProps) => <Icon {...p} d={['M8 3v10', 'M3 8h10']} />,
  settings:  (p: IconProps) => <Icon {...p} d={['M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z', 'M13 8c0 .4-.04.8-.12 1.18l1.42 1.06-1.4 2.42-1.7-.5a4.8 4.8 0 0 1-2.04 1.18L8.7 15h-1.4l-.46-1.66a4.8 4.8 0 0 1-2.04-1.18l-1.7.5-1.4-2.42L3.12 9.18A6 6 0 0 1 3 8c0-.4.04-.8.12-1.18L1.7 5.76l1.4-2.42 1.7.5a4.8 4.8 0 0 1 2.04-1.18L7.3 1h1.4l.46 1.66a4.8 4.8 0 0 1 2.04 1.18l1.7-.5 1.4 2.42-1.42 1.06c.08.38.12.78.12 1.18z']} />,
  sidebar:   (p: IconProps) => <Icon {...p} d={['M2 3h12v10H2z', 'M6 3v10']} />,
  sun:       (p: IconProps) => <Icon {...p} d={['M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11L3.05 3.05']} />,
  moon:      (p: IconProps) => <Icon {...p} d="M13 9.5a5.5 5.5 0 1 1-6.5-6.5 4.5 4.5 0 0 0 6.5 6.5z" />,
  bold:      (p: IconProps) => <Icon {...p} d={['M4 3h4.5a2.5 2.5 0 0 1 0 5H4z', 'M4 8h5a2.5 2.5 0 0 1 0 5H4z']} stroke={1.8} />,
  italic:    (p: IconProps) => <Icon {...p} d={['M6 3h6', 'M4 13h6', 'M10 3l-4 10']} />,
  underline: (p: IconProps) => <Icon {...p} d={['M4 2v7a4 4 0 0 0 8 0V2', 'M3 14h10']} />,
  list:      (p: IconProps) => <Icon {...p} d={['M2.5 4.5h.01', 'M2.5 8h.01', 'M2.5 11.5h.01', 'M6 4.5h8', 'M6 8h8', 'M6 11.5h8']} />,
  quote:     (p: IconProps) => <Icon {...p} d={['M3 9c0-3 2-5 4-5', 'M3 9v4h4V9z', 'M9 9c0-3 2-5 4-5', 'M9 9v4h4V9z']} />,
  link:      (p: IconProps) => <Icon {...p} d={['M7 5L9 3a3 3 0 0 1 4 4l-2 2', 'M9 11l-2 2a3 3 0 0 1-4-4l2-2', 'M6 10l4-4']} />,
  share:     (p: IconProps) => <Icon {...p} d={['M8 2v8', 'M5 5l3-3 3 3', 'M3 9v4h10V9']} />,
  more:      (p: IconProps) => <Icon {...p} d={['M3 8h.01', 'M8 8h.01', 'M13 8h.01']} stroke={2.5} />,
  close:     (p: IconProps) => <Icon {...p} d={['M3 3l10 10', 'M13 3L3 13']} />,
  check:     (p: IconProps) => <Icon {...p} d="M3 8.5l3.5 3.5L13 4.5" stroke={1.8} />,
  arrow:     (p: IconProps) => <Icon {...p} d={['M3 8h10', 'M9 4l4 4-4 4']} />,
  restore:   (p: IconProps) => <Icon {...p} d={['M2 8a6 6 0 1 0 2-4.5', 'M2 1v3.5h3.5']} />,
  h1:        (p: IconProps) => <Icon {...p} d={['M3 3v10', 'M9 3v10', 'M3 8h6', 'M12 5l1-1v9']} />,
  h2:        (p: IconProps) => <Icon {...p} d={['M3 3v10', 'M8 3v10', 'M3 8h5', 'M11 6c0-1 1-2 2-2s2 1 2 2-4 4-4 7h4']} />,
}

export type IconName = keyof typeof Icons
