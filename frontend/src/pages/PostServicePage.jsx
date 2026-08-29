import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Field from "../components/Field";
import Chip from "../components/Chip";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import "./PostServicePage.css";

// Stored as-is in the database, see the note in ServicesDirectoryPage.jsx.
const CATEGORIES = ["Home repair", "Tutoring", "Food", "Other"];

export default function PostServicePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const TYPES = [
    { value: "offer", label: t("postService.offering") },
    { value: "request", label: t("postService.requesting") },
  ];
  const [category, setCategory] = useState("Home repair");
  const [type, setType] = useState("offer");
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createService({
        type,
        category,
        title: form.title,
        description: form.description,
        price: form.price || undefined,
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

        <div className="ch-field-block">
          <span className="ch-field-block__label">{t("postService.photoOptional")}</span>
          <div className="ch-photo-upload">{t("postService.addPhoto")}</div>
        </div>

        {error && <p className="ch-post-error">{error}</p>}

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? t("postService.posting") : t("postService.postButton")}
        </Button>
      </form>
    </MobileLayout>
  );
}
