import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPostForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';

function isEmbeddable(url) {
  if (!url) return false;
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function isDirectVideo(url) {
  if (!url) return false;
  return url.startsWith('/uploads/videos/') || /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
}

export default function SiteSettings() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSubtitle, setVideoSubtitle] = useState('');
  const fileRef = useRef();

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      const result = await apiPostForm('/settings/upload-video', fd);
      setVideoUrl(result.url);
      addToast('Video uploaded', 'success');
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveVideo = async () => {
    try {
      await apiDelete('/settings/video');
      setVideoUrl('');
      addToast('Video removed', 'success');
    } catch {
      addToast('Failed to remove video', 'error');
    }
  };

  const embedUrl = getEmbedUrl(videoUrl);
  const directVideo = isDirectVideo(videoUrl);
  const hasPreview = embedUrl || directVideo;

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
          Upload a video file or paste a YouTube / Vimeo URL. Leave empty to hide the video section on the homepage.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Upload Video File</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Choose File'}
              </button>
              <input ref={fileRef} type="file" accept=".mp4,.webm,.mov,.ogg" onChange={handleFileUpload} style={{ display: 'none' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MP4, WebM, MOV, or OGG (max 100 MB)</span>
            </div>
          </div>

          {/* Or divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: 600 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* URL input */}
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

          {/* Title / Subtitle */}
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

        {/* Preview */}
        {hasPreview && (
          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Preview</label>
            <div style={{ position: 'relative', paddingBottom: '56.25%', maxWidth: 600, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Welcome video preview"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={videoUrl}
                  controls
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                />
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {videoUrl && (
            <button className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={handleRemoveVideo}>
              Remove Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
