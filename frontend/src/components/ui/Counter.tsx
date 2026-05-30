import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import './Counter.css';

interface NumberProps {
  mv: ReturnType<typeof useSpring>;
  number: number;
  height: number;
}

function Num({ mv, number, height }: NumberProps) {
  const y = useTransform(mv, (latest: number) => {
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) memo -= 10 * height;
    return memo;
  });
  return (
    <motion.span className="counter-number" style={{ y }}>
      {number}
    </motion.span>
  );
}

function normalizeNearInteger(num: number) {
  const nearest = Math.round(num);
  const tolerance = 1e-9 * Math.max(1, Math.abs(num));
  return Math.abs(num - nearest) < tolerance ? nearest : num;
}

interface DigitProps {
  place: number | '.';
  value: number;
  height: number;
  digitStyle?: React.CSSProperties;
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
  const isDecimal = place === '.';
  const valueRoundedToPlace = isDecimal ? 0 : Math.floor(normalizeNearInteger(value / (place as number)));
  const animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    if (!isDecimal) animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace, isDecimal]);

  if (isDecimal) {
    return (
      <span className="counter-digit" style={{ height, ...digitStyle, width: 'fit-content' }}>
        .
      </span>
    );
  }

  return (
    <span className="counter-digit" style={{ height, ...digitStyle }}>
      {Array.from({ length: 10 }, (_, i) => (
        <Num key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  );
}

interface CounterProps {
  value: number;
  places: (number | '.')[];
  fontSize?: number;
  padding?: number;
  gap?: number;
  borderRadius?: number;
  horizontalPadding?: number;
  textColor?: string;
  fontWeight?: string | number;
  containerStyle?: React.CSSProperties;
  counterStyle?: React.CSSProperties;
  digitStyle?: React.CSSProperties;
  gradientHeight?: number;
  gradientFrom?: string;
  gradientTo?: string;
  topGradientStyle?: React.CSSProperties;
  bottomGradientStyle?: React.CSSProperties;
}

export default function Counter({
  value,
  places,
  fontSize = 100,
  padding = 0,
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = 'inherit',
  fontWeight = 'inherit',
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = 'black',
  gradientTo = 'transparent',
  topGradientStyle,
  bottomGradientStyle,
}: CounterProps) {
  const height = fontSize + padding;

  return (
    <span className="counter-container" style={containerStyle}>
      <span
        className="counter-counter"
        style={{
          fontSize,
          gap,
          borderRadius,
          paddingLeft: horizontalPadding,
          paddingRight: horizontalPadding,
          color: textColor,
          fontWeight,
          direction: 'ltr',
          ...counterStyle,
        }}
      >
        {places.map((place, i) => (
          <Digit key={i} place={place} value={value} height={height} digitStyle={digitStyle} />
        ))}
      </span>
      <span className="gradient-container">
        <span
          className="top-gradient"
          style={topGradientStyle ?? { height: gradientHeight, background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})` }}
        />
        <span
          className="bottom-gradient"
          style={bottomGradientStyle ?? { height: gradientHeight, background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})` }}
        />
      </span>
    </span>
  );
}
