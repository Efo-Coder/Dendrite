import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { Note, Profile, PublishedNote } from '../types';
import { profileService } from '../services/profile.service';
import { publishedService } from '../services/published.service';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useColumnCount } from '../hooks/useColumnCount';
import { useToast } from '../components/ui/ToastContainer';
import { PAGE_FADE } from '../lib/pageMotion';
import { usePublishedCopy } from '../components/explore/usePublishedCopy';
import BackButton from '../components/home/BackButton';
import PublishedNoteCard from '../components/explore/PublishedNoteCard';
import PublishedNoteReader from '../components/explore/PublishedNoteReader';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAsset = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

interface ProfileViewProps {
  userId: string;
  onOpenInline: (note: Note) => void;
  onOpenProfile: (userId: string, fromReaderId?: string) => void;
  onBack: () => void;
}

const formatJoin = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

const ProfileView = ({ userId, onOpenInline, onOpenProfile, onBack }: ProfileViewProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<PublishedNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const { copyingId, copy } = usePublishedCopy(onOpenInline);
  const toast = useToast();
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollRef, contentRef, `profile:${userId}`);
  const [gridRef, cols] = useColumnCount(280, 20);

  useEffect(() => {
    setLoading(true);
    setNotesLoading(true);
    setReadingId(null);
    profileService
      .getProfile(userId)
      .then((p) => {
        setProfile(p);
        setFollowing(p.isFollowing);
      })
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
    publishedService
      .list({ author: userId })
      .then((res) => setNotes(res.items))
      .catch(() => {})
      .finally(() => setNotesLoading(false));
  }, [userId]);

  // Optimistic follow toggle — flip immediately, revert on failure.
  const toggleFollow = async () => {
    if (followBusy) return;
    const next = !following;
    setFollowing(next);
    setFollowBusy(true);
    setProfile((p) => (p ? { ...p, followerCount: p.followerCount + (next ? 1 : -1) } : p));
    try {
      if (next) await profileService.follow(userId);
      else await profileService.unfollow(userId);
    } catch {
      setFollowing(!next);
      setProfile((p) => (p ? { ...p, followerCount: p.followerCount + (next ? -1 : 1) } : p));
      toast.error('Could not update follow');
    } finally {
      setFollowBusy(false);
    }
  };

  // Reflect a like toggled in the reader back onto the profile's note card.
  const handleLikeChange = (likedId: string, liked: boolean, likeCount: number) =>
    setNotes((prev) => prev.map((p) => (p.id === likedId ? { ...p, isLiked: liked, likeCount } : p)));

  return (
    <AnimatePresence mode="wait">
      {readingId ? (
        <motion.div key="reader" className="flex min-h-0 flex-1 flex-col" {...PAGE_FADE}>
          <PublishedNoteReader
            id={readingId}
            onBack={() => setReadingId(null)}
            onCopy={copy}
            onOpenAuthor={(uid) => onOpenProfile(uid, readingId ?? undefined)}
            onLikeChange={handleLikeChange}
            copying={copyingId !== null}
          />
        </motion.div>
      ) : (
        <motion.div key="profile" className="flex min-h-0 flex-1 flex-col" {...PAGE_FADE}>
          <main ref={scrollRef} className="home-main">
            <div ref={contentRef} className="home-content">
              <div className="home-view-topbar">
                <BackButton onClick={onBack} label="Back" />
              </div>

              {loading || !profile ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-(--ink-dim)" />
                </div>
              ) : (
                <>
                  <header className="mb-10">
                    <div className="mb-5 flex items-center gap-4">
                      {profile.avatarUrl ? (
                        <img src={resolveAsset(profile.avatarUrl)} alt="" className="h-18 w-18 rounded-full object-cover" />
                      ) : (
                        <span className="avatar-fill" style={{ width: 72, height: 72, fontSize: 30 }}>
                          {(profile.name || 'S').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <h1 className="text-3xl text-(--ink)" style={{ fontFamily: 'var(--serif-display)' }}>
                        {profile.name || 'Someone'}
                      </h1>
                    </div>

                    {profile.bio && (
                      <p className="mb-4 max-w-2xl text-base leading-relaxed text-(--ink-mid)">{profile.bio}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-(--ink-dim)">
                      <span>
                        <span className="font-medium text-(--ink-mid)">{profile.publishedCount}</span> published
                      </span>
                      <span>
                        <span className="font-medium text-(--ink-mid)">{profile.followerCount}</span> followers
                      </span>
                      <span>
                        <span className="font-medium text-(--ink-mid)">{profile.followingCount}</span> following
                      </span>
                      <span>·</span>
                      <span>Joined {formatJoin(profile.createdAt)}</span>
                    </div>

                    {!profile.isSelf && (
                      <div className="mt-6">
                        {following ? (
                          <button
                            type="button"
                            onClick={toggleFollow}
                            disabled={followBusy}
                            className="profile-following disabled:opacity-60"
                          >
                            <UserCheck className="h-4 w-4" /> Following
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={toggleFollow}
                            disabled={followBusy}
                            className="btn primary profile-follow disabled:opacity-60"
                          >
                            <UserPlus className="h-4 w-4" /> Follow
                          </button>
                        )}
                      </div>
                    )}
                  </header>

                  <section ref={gridRef}>
                    <p className="explore-section-title">Published notes</p>
                    {notesLoading ? (
                      <div className="explore-grid">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="explore-skeleton" />
                        ))}
                      </div>
                    ) : notes.length === 0 ? (
                      <p className="home-empty">No published notes yet.</p>
                    ) : (
                      <div className="explore-grid">
                        {notes.map((pub) => (
                          <PublishedNoteCard
                            key={pub.id}
                            pub={pub}
                            onOpen={() => setReadingId(pub.id)}
                            onCopy={() => copy(pub)}
                            onOpenAuthor={() => onOpenProfile(pub.owner.id)}
                            copying={copyingId === pub.id}
                          />
                        ))}
                        {Array.from({ length: (cols - (notes.length % cols)) % cols }, (_, i) => (
                          <div key={`ph-${i}`} className="home-card-ph" aria-hidden />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileView;
