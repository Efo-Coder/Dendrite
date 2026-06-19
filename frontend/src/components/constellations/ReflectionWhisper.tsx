import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ReflectionWhisperProps {
  sentences: string[];
}

const INTERVAL_MS = 8000;

// One quiet, reflective line at a time, drifting from one to the next. DOM (not
// canvas) so the type stays crisp and uses the brand serif.
const ReflectionWhisper = ({ sentences }: ReflectionWhisperProps) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (sentences.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % sentences.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [sentences.length]);

  if (sentences.length === 0) return null;

  return (
    <div className="constellation-whisper">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          className="constellation-whisper-line"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        >
          {sentences[index % sentences.length]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default ReflectionWhisper;
