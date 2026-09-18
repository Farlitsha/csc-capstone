import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Field from "../components/Field";
import Chip from "../components/Chip";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./PostServicePage.css";

// Stored as-is in the database, see the note in ServicesDirectoryPage.jsx.
const CATEGORIES = ["Home repair", "Tutoring", "Food", "Other"];

export default function PostServicePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const TYPES = [
    { value: "offer", label: t("postService.offering") },
    { value: "request", label: t("postService.requesting") },
  ];
  const [category, setCategory] = useState("Home repair");
  const [type, setType] = useState("offer");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    phone: user?.phone || user?.contact_phone || "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (form.phone && form.phone.trim() !== (user?.phone || user?.contact_phone || "")) {
        await api.updateProfile({ phone: form.phone.trim(), contact_phone: form.phone.trim() });
        await refreshUser();
      }

      let imageUrl = undefined;
      if (photoFile) {
        const uploadRes = await api.uploadServicePhoto(photoFile);
        imageUrl = uploadRes?.image_url;
      }

      await api.createService({
        type,
        category,
        title: form.title,
        description: form.description,
        price: form.price || undefined,
        image_url: imageUrl,
        image_size: photoFile ? photoFile.size : undefined,
      });
      navigate("/services");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not post this service.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileLayout title={t("postService.title")} onBack={() => navigate(-1)} hideNav>
      <form className="ch-post-form" onSubmit={handleSubmit}>
        <div className="ch-field-block">
          <div className="ch-post-categories">
            {TYPES.map((opt) => (
              <Chip key={opt.value} label={opt.label} active={type === opt.value} onClick={() => setType(opt.value)} />
            ))}
          </div>
        </div>

        <div className="ch-field-block">
          <span className="ch-field-block__label">{t("postService.category")}</span>
          <div className="ch-post-categories">
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
        </div>

        <Field
          label={t("postService.serviceTitle")}
          id="title"
          placeholder="e.g. Plumbing & fittings"
          value={form.title}
          onChange={update("title")}
          required
        />

        <Field
          label={t("postService.description")}
          id="description"
          as="textarea"
          placeholder="Describe what you offer, availability, experience…"
          value={form.description}
          onChange={update("description")}
          required
        />

        <Field
          label={t("postService.price")}
          id="price"
          placeholder="From R150"
          value={form.price}
          onChange={update("price")}
        />

        <Field
          label={t("signup.phone") || "Phone / WhatsApp number"}
          id="phone"
          type="tel"
          placeholder="e.g. +27 82 123 4567"
          value={form.phone}
          onChange={update("phone")}
        />

        <div className="ch-field-block">
          <span className="ch-field-block__label">{t("postService.photoOptional")}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handlePhotoSelect}
          />
          {photoPreview ? (
            <div className="ch-photo-preview-box">
              <img src={photoPreview} alt="Service preview" className="ch-photo-preview-img" />
              <div className="ch-photo-preview-actions">
                <button
                  type="button"
                  className="ch-photo-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("postService.changePhoto") || "Change photo"}
                </button>
                <button
                  type="button"
                  className="ch-photo-action-btn ch-photo-action-btn--remove"
                  onClick={handleRemovePhoto}
                >
                  {t("postService.removePhoto") || "Remove photo"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="ch-photo-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              {t("postService.addPhoto")}
            </div>
          )}
        </div>

        <div className="ch-post-contact-info">
          <Icon name="info" size={16} />
          <span>
            {t("postService.contactNotice") || "Community members will contact you directly via WhatsApp or Email."}
          </span>
        </div>

        {error && <p className="ch-post-error">{error}</p>}

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? t("postService.posting") : t("postService.postButton")}
        </Button>
      </form>
    </MobileLayout>
  );
}
