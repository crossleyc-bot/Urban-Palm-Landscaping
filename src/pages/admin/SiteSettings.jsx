import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../api';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';

export default function SiteSettings() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSubtitle, setVideoSubtitle] = useState('');

  useEffect(() => {
    apiGet('/settings').then(s => {
      setVideoUrl(s.welcome_video_url || '');
      setVideoTitle(s.welcome_video_title || '');
      setVideoSubtitle(s.welcome_video_subtitle || '');
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/settings', {
        welcome_video_url: videoUrl.trim(),
        welcome_video_title: videoTitle.trim(),
        welcome_video_subtitle: videoSubtitle.trim(),
      });
      addToast('Settings saved', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Site Settings</h1><p>Manage homepage welcome video and other site-wide settings.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Site Settings</h1>
        <p>Manage homepage welcome video and other site-wide settings.</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Welcome Video</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Paste a YouTube or Vimeo URL to display a welcome video on the homepage. Leave empty to hide the video section.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Video URL</label>
            <input
              className="table-input"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              style={{ maxWidth: 600 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: 600 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Section Title</label>
              <input
                className="table-input"
                value={videoTitle}
                onChange={e => setVideoTitle(e.target.value)}
                placeholder="Welcome to Urban Palm"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Section Subtitle</label>
              <input
                className="table-input"
                value={videoSubtitle}
                onChange={e => setVideoSubtitle(e.target.value)}
                placeholder="See what we can do for your outdoor space."
              />
            </div>
          </div>
        </div>

        {embedUrl && (
          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Preview</label>
            <div style={{ position: 'relative', paddingBottom: '56.25%', maxWidth: 600, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <iframe
                src={embedUrl}
                title="Welcome video preview"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
