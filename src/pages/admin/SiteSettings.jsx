import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPostForm, apiPutForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import { useSiteSettings, PAGE_KEYS } from '../../context/SiteSettingsContext';
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

const emptySlide = { badge: '', headline: '', subtext: '', cta_label: '', cta_link: '', cta2_label: '', cta2_link: '', sort_order: 0 };

export default function SiteSettings() {
  const { addToast } = useToast();
  const { refresh: refreshSiteSettings } = useSiteSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageVisibility, setPageVisibility] = useState({});
  const [pageVisSaving, setPageVisSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSubtitle, setVideoSubtitle] = useState('');
  const fileRef = useRef();

  // Stripe settings
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeKeysSaving, setStripeKeysSaving] = useState(false);
  const [stripeKeysLoaded, setStripeKeysLoaded] = useState(false);

  // Hero carousel state
  const [slides, setSlides] = useState([]);
  const [slideModal, setSlideModal] = useState(null); // null = closed, 'new' or slide object
  const [slideForm, setSlideForm] = useState(emptySlide);
  const [slideImage, setSlideImage] = useState(null);
  const [slideSaving, setSlideSaving] = useState(false);
  const slideFileRef = useRef();

  useEffect(() => {
    Promise.all([
      apiGet('/settings'),
      apiGet('/hero-slides'),
    ]).then(([s, sl]) => {
      setVideoUrl(s.welcome_video_url || '');
      setVideoTitle(s.welcome_video_title || '');
      setVideoSubtitle(s.welcome_video_subtitle || '');
      setStripePublishableKey(s.stripe_publishable_key || '');
      setStripeSecretKey(s.stripe_secret_key ? '••••••••' : '');
      setStripeKeysLoaded(!!s.stripe_secret_key);
      // Initialize page visibility (default to '1' for all)
      const vis = {};
      for (const p of PAGE_KEYS) vis[p.key] = s[p.key] !== '0' ? '1' : '0';
      setPageVisibility(vis);
      setSlides(sl);
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

  // ── Hero slide handlers ──

  const openNewSlide = () => {
    setSlideModal('new');
    setSlideForm({ ...emptySlide, sort_order: slides.length });
    setSlideImage(null);
    if (slideFileRef.current) slideFileRef.current.value = '';
  };

  const openEditSlide = (slide) => {
    setSlideModal(slide);
    setSlideForm({
      badge: slide.badge || '',
      headline: slide.headline || '',
      subtext: slide.subtext || '',
      cta_label: slide.cta_label || '',
      cta_link: slide.cta_link || '',
      cta2_label: slide.cta2_label || '',
      cta2_link: slide.cta2_link || '',
      sort_order: slide.sort_order ?? 0,
    });
    setSlideImage(null);
    if (slideFileRef.current) slideFileRef.current.value = '';
  };

  const saveSlide = async () => {
    const isNew = slideModal === 'new';
    if (isNew && !slideImage) {
      addToast('Please select an image', 'error');
      return;
    }
    setSlideSaving(true);
    try {
      const fd = new FormData();
      if (slideImage) fd.append('image', slideImage);
      Object.entries(slideForm).forEach(([k, v]) => fd.append(k, v));
      if (!isNew) fd.append('active', slideModal.active ?? 1);

      let saved;
      if (isNew) {
        saved = await apiPostForm('/hero-slides', fd);
        setSlides(prev => [...prev, saved]);
      } else {
        saved = await apiPutForm(`/hero-slides/${slideModal.id}`, fd);
        setSlides(prev => prev.map(s => s.id === saved.id ? saved : s));
      }
      setSlideModal(null);
      addToast(isNew ? 'Slide added' : 'Slide updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save slide', 'error');
    } finally {
      setSlideSaving(false);
    }
  };

  const toggleSlide = async (slide) => {
    const newActive = slide.active ? 0 : 1;
    try {
      const fd = new FormData();
      fd.append('badge', slide.badge || '');
      fd.append('headline', slide.headline || '');
      fd.append('subtext', slide.subtext || '');
      fd.append('cta_label', slide.cta_label || '');
      fd.append('cta_link', slide.cta_link || '');
      fd.append('cta2_label', slide.cta2_label || '');
      fd.append('cta2_link', slide.cta2_link || '');
      fd.append('sort_order', slide.sort_order ?? 0);
      fd.append('active', newActive);
      const updated = await apiPutForm(`/hero-slides/${slide.id}`, fd);
      setSlides(prev => prev.map(s => s.id === updated.id ? updated : s));
      addToast(newActive ? 'Slide enabled' : 'Slide disabled', 'success');
    } catch {
      addToast('Failed to update slide', 'error');
    }
  };

  const deleteSlide = async (slide) => {
    if (!confirm('Delete this carousel slide?')) return;
    try {
      await apiDelete(`/hero-slides/${slide.id}`);
      setSlides(prev => prev.filter(s => s.id !== slide.id));
      addToast('Slide deleted', 'success');
    } catch {
      addToast('Failed to delete slide', 'error');
    }
  };

  const embedUrl = getEmbedUrl(videoUrl);
  const directVideo = isDirectVideo(videoUrl);
  const hasPreview = embedUrl || directVideo;

  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' };
  const fieldGap = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Site Settings</h1><p>Manage homepage content and other site-wide settings.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Site Settings</h1>
        <p>Manage homepage content and other site-wide settings.</p>
      </div>

      {/* ── Hero Carousel ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Hero Carousel</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0', lineHeight: 1.6 }}>
              Manage the rotating banner images on the homepage. Drag to reorder or toggle visibility.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openNewSlide}>Add Slide</button>
        </div>

        {slides.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No carousel slides yet. Add one to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[...slides].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((slide) => (
              <div
                key={slide.id}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  background: slide.active ? 'var(--color-surface)' : 'var(--color-bg-secondary)',
                  opacity: slide.active ? 1 : 0.6,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 120,
                  height: 68,
                  borderRadius: 6,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid var(--color-border)',
                  background: '#0a1f12',
                }}>
                  <img
                    src={slide.image}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slide.headline || '(No headline)'}
                  </div>
                  {slide.badge && (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{slide.badge}</span>
                  )}
                </div>

                {/* Order */}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  #{(slide.sort_order ?? 0) + 1}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button
                    className={`btn btn-sm ${slide.active ? 'btn-outline' : 'btn-secondary'}`}
                    onClick={() => toggleSlide(slide)}
                    title={slide.active ? 'Disable' : 'Enable'}
                    style={{ minWidth: 32 }}
                  >
                    {slide.active ? 'On' : 'Off'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => openEditSlide(slide)}>Edit</button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => deleteSlide(slide)}
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Welcome Video ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Welcome Video</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Upload a video file or paste a YouTube / Vimeo URL. Leave empty to hide the video section on the homepage.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Upload */}
          <div style={fieldGap}>
            <label style={labelStyle}>Upload Video File</label>
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
          <div style={fieldGap}>
            <label style={labelStyle}>Video URL</label>
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
            <div style={fieldGap}>
              <label style={labelStyle}>Section Title</label>
              <input
                className="table-input"
                value={videoTitle}
                onChange={e => setVideoTitle(e.target.value)}
                placeholder="Welcome to Urban Palm"
              />
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Section Subtitle</label>
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
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>Preview</label>
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

      {/* ── Stripe / Payment Settings ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Payment Settings (Stripe)</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Enter your Stripe API keys to enable online invoice payments. You can find these in your{' '}
          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
            Stripe Dashboard
          </a>. Use <strong>test keys</strong> (starting with <code>pk_test_</code> / <code>sk_test_</code>) for development.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 600 }}>
          <div style={fieldGap}>
            <label style={labelStyle}>Publishable Key</label>
            <input
              className="table-input"
              value={stripePublishableKey}
              onChange={e => setStripePublishableKey(e.target.value)}
              placeholder="pk_test_..."
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>Secret Key</label>
            <input
              className="table-input"
              type="password"
              value={stripeSecretKey}
              onChange={e => setStripeSecretKey(e.target.value)}
              onFocus={() => { if (stripeSecretKey === '••••••••') setStripeSecretKey(''); }}
              placeholder="sk_test_..."
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              The secret key is stored securely and never exposed to the browser.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            className="btn btn-primary"
            disabled={stripeKeysSaving}
            onClick={async () => {
              setStripeKeysSaving(true);
              try {
                const payload = { stripe_publishable_key: stripePublishableKey.trim() };
                // Only send secret key if it was actually changed
                if (stripeSecretKey && stripeSecretKey !== '••••••••') {
                  payload.stripe_secret_key = stripeSecretKey.trim();
                }
                await apiPut('/settings', payload);
                setStripeKeysLoaded(!!stripePublishableKey.trim());
                if (stripeSecretKey && stripeSecretKey !== '••••••••') setStripeSecretKey('••••••••');
                addToast('Stripe keys saved', 'success');
              } catch {
                addToast('Failed to save Stripe keys', 'error');
              } finally {
                setStripeKeysSaving(false);
              }
            }}
          >
            {stripeKeysSaving ? 'Saving...' : 'Save Stripe Keys'}
          </button>
          {stripeKeysLoaded && (
            <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>
              &#10003; Stripe is configured
            </span>
          )}
        </div>
      </div>

      {/* ── Page Visibility ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Page Visibility</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Control which pages are visible to visitors. Hidden pages will be removed from the navigation and redirect to the homepage.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
          {PAGE_KEYS.map(p => (
            <label
              key={p.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                cursor: 'pointer',
                background: pageVisibility[p.key] === '1' ? 'var(--color-surface)' : 'var(--color-bg-secondary)',
                opacity: pageVisibility[p.key] === '1' ? 1 : 0.6,
                transition: 'opacity 0.2s, background 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={pageVisibility[p.key] === '1'}
                onChange={e => setPageVisibility(prev => ({ ...prev, [p.key]: e.target.checked ? '1' : '0' }))}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.path}</span>
            </label>
          ))}
        </div>

        <button
          className="btn btn-primary"
          disabled={pageVisSaving}
          onClick={async () => {
            setPageVisSaving(true);
            try {
              await apiPut('/settings', pageVisibility);
              refreshSiteSettings();
              addToast('Page visibility saved', 'success');
            } catch {
              addToast('Failed to save page visibility', 'error');
            } finally {
              setPageVisSaving(false);
            }
          }}
        >
          {pageVisSaving ? 'Saving...' : 'Save Page Visibility'}
        </button>
      </div>

      {/* ── Slide Editor Modal ── */}
      {slideModal && (
        <div className="modal-overlay" onClick={() => setSlideModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{slideModal === 'new' ? 'Add Carousel Slide' : 'Edit Carousel Slide'}</h3>
              <button className="modal-close" onClick={() => setSlideModal(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Image */}
              <div style={fieldGap}>
                <label style={labelStyle}>Image *</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {(slideImage || (slideModal !== 'new' && slideModal.image)) && (
                    <div style={{ width: 160, height: 90, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0, background: '#0a1f12' }}>
                      <img
                        src={slideImage ? URL.createObjectURL(slideImage) : slideModal.image}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}
                  <div>
                    <button className="btn btn-outline btn-sm" onClick={() => slideFileRef.current?.click()}>
                      {slideModal === 'new' && !slideImage ? 'Choose Image' : 'Replace Image'}
                    </button>
                    <input
                      ref={slideFileRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={e => setSlideImage(e.target.files[0] || null)}
                      style={{ display: 'none' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Recommended: 1920x1080 landscape
                    </p>
                  </div>
                </div>
              </div>

              {/* Badge + Headline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div style={fieldGap}>
                  <label style={labelStyle}>Badge</label>
                  <input className="table-input" value={slideForm.badge} onChange={e => setSlideForm(f => ({ ...f, badge: e.target.value }))} placeholder="e.g. Residential" />
                </div>
                <div style={fieldGap}>
                  <label style={labelStyle}>Headline</label>
                  <input className="table-input" value={slideForm.headline} onChange={e => setSlideForm(f => ({ ...f, headline: e.target.value }))} placeholder="Transform Your Backyard..." />
                </div>
              </div>

              {/* Subtext */}
              <div style={fieldGap}>
                <label style={labelStyle}>Subtext</label>
                <input className="table-input" value={slideForm.subtext} onChange={e => setSlideForm(f => ({ ...f, subtext: e.target.value }))} placeholder="Short description..." />
              </div>

              {/* CTA buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={fieldGap}>
                  <label style={labelStyle}>Primary Button Label</label>
                  <input className="table-input" value={slideForm.cta_label} onChange={e => setSlideForm(f => ({ ...f, cta_label: e.target.value }))} placeholder="Get Free Quote" />
                </div>
                <div style={fieldGap}>
                  <label style={labelStyle}>Primary Button Link</label>
                  <input className="table-input" value={slideForm.cta_link} onChange={e => setSlideForm(f => ({ ...f, cta_link: e.target.value }))} placeholder="/contact" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={fieldGap}>
                  <label style={labelStyle}>Secondary Button Label</label>
                  <input className="table-input" value={slideForm.cta2_label} onChange={e => setSlideForm(f => ({ ...f, cta2_label: e.target.value }))} placeholder="View Portfolio" />
                </div>
                <div style={fieldGap}>
                  <label style={labelStyle}>Secondary Button Link</label>
                  <input className="table-input" value={slideForm.cta2_link} onChange={e => setSlideForm(f => ({ ...f, cta2_link: e.target.value }))} placeholder="/portfolio" />
                </div>
              </div>

              {/* Sort order */}
              <div style={{ ...fieldGap, maxWidth: 120 }}>
                <label style={labelStyle}>Sort Order</label>
                <input className="table-input" type="number" value={slideForm.sort_order} onChange={e => setSlideForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSlideModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSlide} disabled={slideSaving}>
                {slideSaving ? 'Saving...' : slideModal === 'new' ? 'Add Slide' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
