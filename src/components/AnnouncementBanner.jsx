import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/announcements/active')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.id) {
          const dismissedId = sessionStorage.getItem('dismissed_announcement');
          if (dismissedId === String(data.id)) return;
          setAnnouncement(data);
        }
      })
      .catch(() => {});
  }, []);

  if (!announcement || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('dismissed_announcement', String(announcement.id));
    setDismissed(true);
  };

  return (
    <div
      className="announcement-banner"
      style={{
        background: announcement.bg_color || '#166534',
        color: announcement.text_color || '#ffffff',
        padding: '0.5rem 1rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        fontWeight: 500,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
      }}
    >
      <span>{announcement.message}</span>
      {announcement.link_text && announcement.link_url && (
        <Link
          to={announcement.link_url}
          style={{
            color: announcement.text_color || '#ffffff',
            fontWeight: 700,
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
          }}
        >
          {announcement.link_text}
        </Link>
      )}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: announcement.text_color || '#ffffff',
          fontSize: '1.1rem',
          cursor: 'pointer',
          opacity: 0.7,
          padding: '0.25rem',
          lineHeight: 1,
        }}
      >
        &#10005;
      </button>
    </div>
  );
}
