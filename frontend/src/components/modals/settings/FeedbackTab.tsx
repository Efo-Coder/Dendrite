import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { feedbackService } from '../../../services/feedback.service';

// "Feedback" settings pane: star rating and bug report forms
const FeedbackTab = () => {
  const [starHover, setStarHover] = useState(0);
  const [starRating, setStarRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugLoading, setBugLoading] = useState(false);
  const [bugDone, setBugDone] = useState(false);

  const handleSubmitRating = async () => {
    if (!starRating) return;
    setRatingLoading(true);
    try {
      await Promise.all([
        feedbackService.submitRating(starRating, ratingComment || undefined),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setRatingDone(true);
    } catch {
      /* submission failed — form stays editable */
    } finally {
      setRatingLoading(false);
    }
  };

  const handleSubmitBug = async () => {
    if (!bugTitle.trim() || !bugDesc.trim()) return;
    setBugLoading(true);
    try {
      await Promise.all([
        feedbackService.submitBugReport(bugTitle.trim(), bugDesc.trim()),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setBugDone(true);
      setBugTitle('');
      setBugDesc('');
    } catch {
      /* submission failed — form stays editable */
    } finally {
      setBugLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'var(--serif-body)' }}>
      <div style={{ paddingTop: 13, paddingBottom: 28 }}>
        <div className="lbl" style={{ marginBottom: 12 }}>
          Rate your experience
          <small>How do you feel about Dendrite so far?</small>
        </div>
        <AnimatePresence mode="wait">
          {ratingDone ? (
            <motion.div
              key="rating-done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              Thank you — your feedback matters.
            </motion.div>
          ) : (
            <motion.div
              key="rating-form"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    className="no-press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 22, color: s <= (starHover || starRating) ? 'var(--accent)' : 'var(--line)', transition: 'color 0.15s' }}
                    onMouseEnter={() => setStarHover(s)}
                    onMouseLeave={() => setStarHover(0)}
                    onClick={() => setStarRating(s)}
                  >
                    ★
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {starRating > 0 && (
                  <motion.textarea
                    key="rating-textarea"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Optional comment…"
                    rows={2}
                    style={{ fontFamily: 'var(--serif-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '0.5px solid var(--line)', borderRadius: 6, padding: '8px 10px', resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {starRating > 0 && (
                  <motion.div
                    key="rating-submit"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <button
                      className="btn-ghost"
                      style={{ border: '0.5px solid var(--line)' }}
                      onClick={handleSubmitRating}
                      disabled={ratingLoading}
                    >
                      {ratingLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Sending…</span> : 'Submit'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ borderTop: '0.5px solid var(--line)', margin: '0 0 28px' }} />

      <div>
        <div className="lbl" style={{ marginBottom: 12 }}>
          Report a bug
          <small>Something broken? Let us know.</small>
        </div>
        <AnimatePresence mode="wait">
          {bugDone ? (
            <motion.div
              key="bug-done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              Report received — we'll look into it.
            </motion.div>
          ) : (
            <motion.div
              key="bug-form"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <input
                type="text"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                placeholder="Short title…"
                style={{ fontFamily: 'var(--serif-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '0.5px solid var(--line)', borderRadius: 6, padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <textarea
                value={bugDesc}
                onChange={(e) => setBugDesc(e.target.value)}
                placeholder="Describe what happened…"
                rows={3}
                style={{ fontFamily: 'var(--serif-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '0.5px solid var(--line)', borderRadius: 6, padding: '8px 10px', resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                className="btn-ghost"
                style={{ border: '0.5px solid var(--line)', alignSelf: 'flex-start' }}
                onClick={handleSubmitBug}
                disabled={bugLoading || !bugTitle.trim() || !bugDesc.trim()}
              >
                {bugLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Sending report…</span> : 'Send report'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FeedbackTab;
