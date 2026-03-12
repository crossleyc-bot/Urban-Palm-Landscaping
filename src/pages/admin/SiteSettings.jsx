import { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiPatch, apiPostForm, apiPutForm, apiDelete } from '../../api';
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

const emptySlide = { badge: '', headline: '', subtext: '', cta_label: 'Get Free Quote', cta_link: '/quote', cta2_label: '', cta2_link: '', sort_order: 0 };

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

  // Contact info settings
  const [contactAddress1, setContactAddress1] = useState('');
  const [contactAddress2, setContactAddress2] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSaving, setContactSaving] = useState(false);
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [socialSaving, setSocialSaving] = useState(false);

  // Email notification recipients
  const [notifyEmails, setNotifyEmails] = useState([]);
  const [notifyEmailInput, setNotifyEmailInput] = useState('');
  const [notifyFromEmail, setNotifyFromEmail] = useState('');
  const [notifyEmailSaving, setNotifyEmailSaving] = useState(false);

  // Stripe settings
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeKeysSaving, setStripeKeysSaving] = useState(false);
  const [stripeKeysLoaded, setStripeKeysLoaded] = useState(false);

  // USPS settings
  const [uspsUserId, setUspsUserId] = useState('');
  const [uspsSaving, setUspsSaving] = useState(false);
  const [uspsLoaded, setUspsLoaded] = useState(false);

  // Delivery & installation settings
  const [deliveryFee, setDeliveryFee] = useState('');
  const [installationFee, setInstallationFee] = useState('');
  const [deliveryMinimum, setDeliveryMinimum] = useState('');
  const [deliverySaving, setDeliverySaving] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementModal, setAnnouncementModal] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ message: '', link_text: '', link_url: '', bg_color: '#166534', text_color: '#ffffff', active: true });
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  // Hero carousel state
  const [slides, setSlides] = useState([]);
  const [slideModal, setSlideModal] = useState(null); // null = closed, 'new' or slide object
  const [slideForm, setSlideForm] = useState(emptySlide);
  const [slideImage, setSlideImage] = useState(null);
  const [slideSaving, setSlideSaving] = useState(false);
  const slideFileRef = useRef();

  // Memoize object URL for slide image preview and revoke on cleanup
  const slideImagePreview = useMemo(() => slideImage ? URL.createObjectURL(slideImage) : null, [slideImage]);
  useEffect(() => {
    return () => { if (slideImagePreview) URL.revokeObjectURL(slideImagePreview); };
  }, [slideImagePreview]);

  useEffect(() => {
    Promise.all([
      apiGet('/settings'),
      apiGet('/hero-slides'),
      apiGet('/announcements'),
    ]).then(([s, sl, ann]) => {
      setVideoUrl(s.welcome_video_url || '');
      setVideoTitle(s.welcome_video_title || '');
      setVideoSubtitle(s.welcome_video_subtitle || '');
      setContactAddress1(s.contact_address_1 || '25546 High Hampton Circle');
      setContactAddress2(s.contact_address_2 || 'Sorrento, FL 32776');
      setContactPhone(s.contact_phone || '(321) 231-2094');
      setContactEmail(s.contact_email || s.ses_from_email || 'sales@urbanpalmlandscaping.com');
      setSocialFacebook(s.social_facebook || '');
      setSocialInstagram(s.social_instagram || '');
      setSocialYoutube(s.social_youtube || '');
      setNotifyFromEmail(s.ses_from_email || '');
      setNotifyEmails(s.contact_notify_email ? s.contact_notify_email.split(',').map(e => e.trim()).filter(Boolean) : []);
      setStripePublishableKey(s.stripe_publishable_key || '');
      setStripeSecretKey(s.stripe_secret_key ? '••••••••' : '');
      setStripeKeysLoaded(!!s.stripe_secret_key);
      setUspsUserId(s.usps_user_id ? '••••••••' : '');
      setUspsLoaded(!!s.usps_user_id);
      setDeliveryFee(s.delivery_fee || '');
      setInstallationFee(s.installation_fee || '');
      setDeliveryMinimum(s.delivery_minimum || '');
      // Initialize page visibility (default to '1' for all)
      const vis = {};
      for (const p of PAGE_KEYS) vis[p.key] = s[p.key] !== '0' ? '1' : '0';
      setPageVisibility(vis);
      setSlides(sl);
      setAnnouncements(ann);
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
    } catch (err) {
      addToast(err.message || 'Failed to save settings', 'error');
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
    } catch (err) {
      addToast(err.message || 'Failed to remove video', 'error');
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
      const updated = await apiPatch(`/hero-slides/${slide.id}`, { active: newActive });
      setSlides(prev => prev.map(s => s.id === updated.id ? updated : s));
      addToast(newActive ? 'Slide enabled' : 'Slide disabled', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update slide', 'error');
    }
  };

  const deleteSlide = async (slide) => {
    if (!confirm('Delete this carousel slide?')) return;
    try {
      await apiDelete(`/hero-slides/${slide.id}`);
      setSlides(prev => prev.filter(s => s.id !== slide.id));
      addToast('Slide deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete slide', 'error');
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

      {/* ── Announcement Banner ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Announcement Banner</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0', lineHeight: 1.6 }}>
              Display a promotional banner across the top of the site. Only the most recent active announcement is shown.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => {
            setAnnouncementForm({ message: '', link_text: '', link_url: '', bg_color: '#166534', text_color: '#ffffff', active: true });
            setAnnouncementModal('new');
          }}>Add Announcement</button>
        </div>

        {announcements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No announcements yet. Add one to show a banner on your site.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {announcements.map(ann => (
              <div
                key={ann.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  opacity: ann.active ? 1 : 0.5,
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 4, background: ann.bg_color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ann.message}
                </div>
                <span className={ann.active ? 'badge badge-green' : 'badge badge-gray'} style={{ fontSize: '0.7rem' }}>
                  {ann.active ? 'Active' : 'Inactive'}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => {
                    setAnnouncementForm({
                      message: ann.message,
                      link_text: ann.link_text || '',
                      link_url: ann.link_url || '',
                      bg_color: ann.bg_color || '#166534',
                      text_color: ann.text_color || '#ffffff',
                      active: !!ann.active,
                    });
                    setAnnouncementModal(ann);
                  }}>Edit</button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={async () => {
                      if (!confirm('Delete this announcement?')) return;
                      await apiDelete(`/announcements/${ann.id}`);
                      setAnnouncements(prev => prev.filter(a => a.id !== ann.id));
                      addToast('Announcement deleted', 'success');
                    }}
                  >Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                    className={`btn btn-sm ${slide.active ? 'btn-outline' : 'btn-primary'}`}
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

      {/* ── Contact Information ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Contact Information</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Update the address, phone, and email shown in the website footer.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 600 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={fieldGap}>
              <label style={labelStyle}>Address Line 1</label>
              <input className="table-input" value={contactAddress1} onChange={e => setContactAddress1(e.target.value)} placeholder="123 Main Street" />
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Address Line 2</label>
              <input className="table-input" value={contactAddress2} onChange={e => setContactAddress2(e.target.value)} placeholder="City, ST 12345" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={fieldGap}>
              <label style={labelStyle}>Phone</label>
              <input className="table-input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Email</label>
              <input className="table-input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="info@example.com" />
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          disabled={contactSaving}
          onClick={async () => {
            setContactSaving(true);
            try {
              await apiPut('/settings', {
                contact_address_1: contactAddress1.trim(),
                contact_address_2: contactAddress2.trim(),
                contact_phone: contactPhone.trim(),
                contact_email: contactEmail.trim(),
              });
              addToast('Contact info saved', 'success');
            } catch (err) {
              addToast(err.message || 'Failed to save contact info', 'error');
            } finally {
              setContactSaving(false);
            }
          }}
        >
          {contactSaving ? 'Saving...' : 'Save Contact Info'}
        </button>
      </div>

      {/* ── Email Notification Recipients ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email Notifications</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Manage the email addresses that receive notifications when a contact form or quote request is submitted.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 600 }}>
          <div style={fieldGap}>
            <label style={labelStyle}>From Address</label>
            <input
              className="table-input"
              type="email"
              value={notifyFromEmail}
              onChange={e => setNotifyFromEmail(e.target.value)}
              placeholder="no-reply@yourdomain.com"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              The sender address for outgoing notification emails (must be verified in AWS SES).
            </span>
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>To Addresses</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: notifyEmails.length ? '0.5rem' : 0 }}>
              {notifyEmails.map((email, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    background: 'var(--color-bg-secondary, #f3f4f6)', border: '1px solid var(--color-border, #d1d5db)',
                    borderRadius: '9999px', padding: '0.25rem 0.5rem 0.25rem 0.75rem', fontSize: '0.85rem',
                  }}
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => setNotifyEmails(prev => prev.filter((_, j) => j !== i))}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.15rem',
                      fontSize: '1.1rem', lineHeight: 1, color: 'var(--color-text-muted)', fontWeight: 700,
                    }}
                    title="Remove"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="table-input"
                type="email"
                value={notifyEmailInput}
                onChange={e => setNotifyEmailInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = notifyEmailInput.trim().toLowerCase();
                    if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && !notifyEmails.includes(val)) {
                      setNotifyEmails(prev => [...prev, val]);
                      setNotifyEmailInput('');
                    }
                  }
                }}
                placeholder="Add email address and press Enter"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  const val = notifyEmailInput.trim().toLowerCase();
                  if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && !notifyEmails.includes(val)) {
                    setNotifyEmails(prev => [...prev, val]);
                    setNotifyEmailInput('');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          disabled={notifyEmailSaving}
          onClick={async () => {
            setNotifyEmailSaving(true);
            try {
              await apiPut('/settings', {
                ses_from_email: notifyFromEmail.trim(),
                contact_notify_email: notifyEmails.join(','),
              });
              addToast('Notification emails saved', 'success');
            } catch (err) {
              addToast(err.message || 'Failed to save notification emails', 'error');
            } finally {
              setNotifyEmailSaving(false);
            }
          }}
        >
          {notifyEmailSaving ? 'Saving...' : 'Save Email Settings'}
        </button>
      </div>

      {/* ── Social Media Links ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Social Media Links</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Add your social media profile URLs. Leave empty to hide from the footer.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 600 }}>
          <div style={fieldGap}>
            <label style={labelStyle}>Facebook URL</label>
            <input className="table-input" value={socialFacebook} onChange={e => setSocialFacebook(e.target.value)} placeholder="https://facebook.com/yourpage" />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>Instagram URL</label>
            <input className="table-input" value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)} placeholder="https://instagram.com/yourpage" />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>YouTube URL</label>
            <input className="table-input" value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" />
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          disabled={socialSaving}
          onClick={async () => {
            setSocialSaving(true);
            try {
              await apiPut('/settings', {
                social_facebook: socialFacebook.trim(),
                social_instagram: socialInstagram.trim(),
                social_youtube: socialYoutube.trim(),
              });
              addToast('Social links saved', 'success');
            } catch (err) {
              addToast(err.message || 'Failed to save social links', 'error');
            } finally {
              setSocialSaving(false);
            }
          }}
        >
          {socialSaving ? 'Saving...' : 'Save Social Links'}
        </button>
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
              } catch (err) {
                addToast(err.message || 'Failed to save Stripe keys', 'error');
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

      {/* ── USPS Address Validation ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Address Validation (USPS)</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Enter your USPS Web Tools User ID to validate customer addresses during registration.
          Register for free at{' '}
          <a href="https://registration.shippingapis.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
            USPS Web Tools
          </a>. If no key is configured, address validation will be skipped.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 600 }}>
          <div style={fieldGap}>
            <label style={labelStyle}>USPS User ID</label>
            <input
              className="table-input"
              type="password"
              value={uspsUserId}
              onChange={e => setUspsUserId(e.target.value)}
              onFocus={() => { if (uspsUserId === '••••••••') setUspsUserId(''); }}
              placeholder="Your USPS Web Tools User ID"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            className="btn btn-primary"
            disabled={uspsSaving}
            onClick={async () => {
              setUspsSaving(true);
              try {
                const payload = {};
                if (uspsUserId && uspsUserId !== '••••••••') {
                  payload.usps_user_id = uspsUserId.trim();
                }
                await apiPut('/settings', payload);
                setUspsLoaded(!!uspsUserId.trim());
                if (uspsUserId && uspsUserId !== '••••••••') setUspsUserId('••••••••');
                addToast('USPS settings saved', 'success');
              } catch (err) {
                addToast(err.message || 'Failed to save USPS settings', 'error');
              } finally {
                setUspsSaving(false);
              }
            }}
          >
            {uspsSaving ? 'Saving...' : 'Save USPS Key'}
          </button>
          {uspsLoaded && (
            <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>
              &#10003; USPS is configured
            </span>
          )}
        </div>
      </div>

      {/* ── Delivery & Installation Fees ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Delivery & Installation</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Set fees for delivery and installation services. Customers can add these at checkout.
          Leave blank or set to 0 to disable an option.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 600 }}>
          <div style={fieldGap}>
            <label style={labelStyle}>Delivery Fee ($)</label>
            <input
              className="table-input"
              type="number"
              min="0"
              step="0.01"
              value={deliveryFee}
              onChange={e => setDeliveryFee(e.target.value)}
              placeholder="e.g. 49.99"
            />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>Minimum Order for Delivery ($)</label>
            <input
              className="table-input"
              type="number"
              min="0"
              step="0.01"
              value={deliveryMinimum}
              onChange={e => setDeliveryMinimum(e.target.value)}
              placeholder="e.g. 75.00"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Delivery option will be disabled if the cart subtotal is below this amount.
            </span>
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>Installation Fee ($)</label>
            <input
              className="table-input"
              type="number"
              min="0"
              step="0.01"
              value={installationFee}
              onChange={e => setInstallationFee(e.target.value)}
              placeholder="e.g. 99.99"
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          disabled={deliverySaving}
          onClick={async () => {
            setDeliverySaving(true);
            try {
              await apiPut('/settings', {
                delivery_fee: deliveryFee,
                installation_fee: installationFee,
                delivery_minimum: deliveryMinimum,
              });
              addToast('Delivery & installation settings saved', 'success');
            } catch (err) {
              addToast(err.message || 'Failed to save', 'error');
            } finally {
              setDeliverySaving(false);
            }
          }}
        >
          {deliverySaving ? 'Saving...' : 'Save Delivery Settings'}
        </button>
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
            } catch (err) {
              addToast(err.message || 'Failed to save page visibility', 'error');
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
                        src={slideImagePreview || slideModal.image}
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
                  <input className="table-input" value={slideForm.cta_link} onChange={e => setSlideForm(f => ({ ...f, cta_link: e.target.value }))} placeholder="/quote" />
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

      {/* ── Announcement Editor Modal ── */}
      {announcementModal && (
        <div className="modal-overlay" onClick={() => setAnnouncementModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{announcementModal === 'new' ? 'New Announcement' : 'Edit Announcement'}</h3>
              <button className="modal-close" onClick={() => setAnnouncementModal(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={fieldGap}>
                <label style={labelStyle}>Message *</label>
                <input
                  className="table-input"
                  value={announcementForm.message}
                  onChange={e => setAnnouncementForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="e.g. Spring Sale! 20% off all products this week"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={fieldGap}>
                  <label style={labelStyle}>Link Text</label>
                  <input
                    className="table-input"
                    value={announcementForm.link_text}
                    onChange={e => setAnnouncementForm(f => ({ ...f, link_text: e.target.value }))}
                    placeholder="e.g. Shop Now"
                  />
                </div>
                <div style={fieldGap}>
                  <label style={labelStyle}>Link URL</label>
                  <input
                    className="table-input"
                    value={announcementForm.link_url}
                    onChange={e => setAnnouncementForm(f => ({ ...f, link_url: e.target.value }))}
                    placeholder="e.g. /products"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={fieldGap}>
                  <label style={labelStyle}>Background Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={announcementForm.bg_color}
                      onChange={e => setAnnouncementForm(f => ({ ...f, bg_color: e.target.value }))}
                      style={{ width: 36, height: 32, padding: 0, border: '1px solid var(--color-border)', borderRadius: 4 }}
                    />
                    <input
                      className="table-input"
                      value={announcementForm.bg_color}
                      onChange={e => setAnnouncementForm(f => ({ ...f, bg_color: e.target.value }))}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                <div style={fieldGap}>
                  <label style={labelStyle}>Text Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={announcementForm.text_color}
                      onChange={e => setAnnouncementForm(f => ({ ...f, text_color: e.target.value }))}
                      style={{ width: 36, height: 32, padding: 0, border: '1px solid var(--color-border)', borderRadius: 4 }}
                    />
                    <input
                      className="table-input"
                      value={announcementForm.text_color}
                      onChange={e => setAnnouncementForm(f => ({ ...f, text_color: e.target.value }))}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div style={fieldGap}>
                <label style={labelStyle}>Preview</label>
                <div style={{
                  background: announcementForm.bg_color,
                  color: announcementForm.text_color,
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}>
                  {announcementForm.message || 'Your announcement message here'}
                  {announcementForm.link_text && (
                    <span style={{ fontWeight: 700, textDecoration: 'underline', marginLeft: '0.5rem' }}>
                      {announcementForm.link_text}
                    </span>
                  )}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={announcementForm.active}
                  onChange={e => setAnnouncementForm(f => ({ ...f, active: e.target.checked }))}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Active</span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAnnouncementModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={announcementSaving}
                onClick={async () => {
                  if (!announcementForm.message.trim()) {
                    addToast('Message is required', 'error');
                    return;
                  }
                  setAnnouncementSaving(true);
                  try {
                    if (announcementModal === 'new') {
                      const created = await apiPost('/announcements', announcementForm);
                      setAnnouncements(prev => [created, ...prev]);
                      addToast('Announcement created', 'success');
                    } else {
                      const updated = await apiPut(`/announcements/${announcementModal.id}`, announcementForm);
                      setAnnouncements(prev => prev.map(a => a.id === announcementModal.id ? updated : a));
                      addToast('Announcement updated', 'success');
                    }
                    setAnnouncementModal(null);
                  } catch (err) {
                    addToast(err.message || 'Failed to save announcement', 'error');
                  } finally {
                    setAnnouncementSaving(false);
                  }
                }}
              >
                {announcementSaving ? 'Saving...' : announcementModal === 'new' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
