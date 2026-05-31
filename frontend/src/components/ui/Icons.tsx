
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
  briefcase: (p: IconProps) => <Icon {...p} d={['M2 5h12v8H2z', 'M6 5V3.5C6 3 6.3 3 7 3h2c.7 0 1 0 1 .5V5']} />,
  tag:       (p: IconProps) => <Icon {...p} d={['M2 2h6l6 6-6 6-6-6z', 'M5 5h.01']} />,
  star:      (p: IconProps) => <Icon {...p} d="M8 1.5l2 4.5 5 .5-3.7 3.2 1.2 4.8L8 12l-4.5 2.5L4.7 9.7 1 6.5l5-.5z" />,
  starFill:  (p: IconProps) => (
    <svg width={p?.size ?? 16} height={p?.size ?? 16} viewBox="0 0 16 16" fill="currentColor" className={p?.className}>
      <path d="M8 1.5l2 4.5 5 .5-3.7 3.2 1.2 4.8L8 12l-4.5 2.5L4.7 9.7 1 6.5l5-.5z" />
    </svg>
  ),
  pinFill:   (p: IconProps) => (
    <svg width={p?.size ?? 16} height={p?.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p?.className}>
      <path d="M12 17v5"/>
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" fill="currentColor"/>
    </svg>
  ),
  settings:  (p: IconProps) => <Icon {...p} d={['M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z', 'M13 8c0 .4-.04.8-.12 1.18l1.42 1.06-1.4 2.42-1.7-.5a4.8 4.8 0 0 1-2.04 1.18L8.7 15h-1.4l-.46-1.66a4.8 4.8 0 0 1-2.04-1.18l-1.7.5-1.4-2.42L3.12 9.18A6 6 0 0 1 3 8c0-.4.04-.8.12-1.18L1.7 5.76l1.4-2.42 1.7.5a4.8 4.8 0 0 1 2.04-1.18L7.3 1h1.4l.46 1.66a4.8 4.8 0 0 1 2.04 1.18l1.7-.5 1.4 2.42-1.42 1.06c.08.38.12.78.12 1.18z']} />,
}
