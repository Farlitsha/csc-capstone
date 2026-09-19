import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { useLanguage } from "../i18n/LanguageContext";
import "./TutorialsPage.css";

export default function TutorialsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tutorials = [
    {
      step: 1,
      category: "Account & Access",
      icon: "user",
      title: t("tutorials.step1Title") || "How to Create an Account",
      description:
        t("tutorials.step1Desc") ||
        "Learn how to register your CommHub account with a simple 5-digit PIN and start browsing local community services and workshops.",
      video: "/videos/create_account.mp4",
      actionLabel: t("tutorials.step1Action") || "Create Account",
      actionPath: "/signup",
    },
    {
      step: 2,
      category: "Local Marketplace",
      icon: "tools",
      title: t("tutorials.step2Title") || "How to Post a Service",
      description:
        t("tutorials.step2Desc") ||
        "Learn how to offer your skills (e.g. plumbing, tutoring, sewing) or request help from nearby Ocean View & Khayelitsha residents.",
      video: "/videos/post_service.mp4",
      actionLabel: t("tutorials.step2Action") || "Explore Services",
      actionPath: "/services",
    },
    {
      step: 3,
      category: "Community Skills",
      icon: "calendar",
      title: t("tutorials.step3Title") || "How to Join a Workshop",
      description:
        t("tutorials.step3Desc") ||
        "Discover free community skills workshops, book a seat in seconds, and track your upcoming workshop reservations.",
      video: "/videos/join_workshop.mp4",
      actionLabel: t("tutorials.step3Action") || "View Workshops",
      actionPath: "/workshops",
    },
    {
      step: 4,
      category: "Account Management",
      icon: "edit",
      title:
        t("tutorials.step4Title") || "How to Edit Your Profile & Manage Account",
      description:
        t("tutorials.step4Desc") ||
        "Learn how to update your phone/WhatsApp number, upload a profile photo, modify active listings, or manage your account.",
      video: "/videos/delete_modify_account.mp4",
      actionLabel: t("tutorials.step4Action") || "Go to Profile",
      actionPath: "/profile",
    },
    //   {
    //   step: 5,
    //   category: "Workshop Management",
    //   icon: "edit",
    //   title:
    //     t("tutorials.step5Title") || "How to Create and Manage Workshops",
    //   description:
    //     t("tutorials.step5Desc") ||
    //     "Learn how to create your own workshops as a Researcher and manage them.",
    //   video: "/videos/manage_workshops.mp4",
    //   actionLabel: t("tutorials.step3Action") || "View Workshops",
    //   actionPath: "/workshops",
    // },

  ];

  return (
    <MobileLayout title={t("tutorials.title") || "Tutorials"} onBack={() => navigate(-1)}>
      <div className="ch-tutorials-page">
        <header className="ch-tutorials-hero">
          <div className="ch-tutorials-hero__badge">
            <Icon name="play" size={14} />
            <span>{t("tutorials.badge") || "Help & Video Guides"}</span>
          </div>
          <h1>{t("tutorials.heading") || "Video Tutorials"}</h1>
          <p className="ch-tutorials-hero__subtitle">
            {t("tutorials.subtitle") ||
              "Watch these step-by-step video guides to learn how to navigate and make the most of CommHub."}
          </p>
        </header>

        <main className="ch-tutorials-grid">
          {tutorials.map((tutorial) => (
            <article key={tutorial.video} className="ch-tutorial-card">
              <div className="ch-tutorial-card__header">
                <div className="ch-tutorial-card__meta">
                  <span className="ch-tutorial-step-badge">Step {tutorial.step}</span>
                  <span className="ch-tutorial-category">
                    <Icon name={tutorial.icon} size={13} />
                    <span>{tutorial.category}</span>
                  </span>
                </div>
                <h2 className="ch-tutorial-card__title">{tutorial.title}</h2>
                <p className="ch-tutorial-card__desc">{tutorial.description}</p>
              </div>

              <div className="ch-tutorial-video-wrapper">
                <video
                  className="ch-tutorial-video"
                  controls
                  preload="metadata"
                  playsInline
                  aria-label={tutorial.title}
                >
                  <source src={tutorial.video} type="video/mp4" />
                  {t("tutorials.videoNotSupported") ||
                    "Your browser does not support HTML5 video playback."}
                </video>
              </div>

              <div className="ch-tutorial-card__footer">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate(tutorial.actionPath)}
                  className="ch-tutorial-action-btn"
                >
                  <span>{tutorial.actionLabel}</span>
                  <span aria-hidden="true">→</span>
                </Button>
              </div>
            </article>
          ))}
        </main>

        <section className="ch-tutorials-help-card">
          <Card title={t("tutorials.helpTitle") || "Need More Assistance?"}>
            <p className="ch-tutorials-help-text">
              {t("tutorials.helpDesc") ||
                "Check our community guidelines or read our data privacy policy to learn more about how CommHub works."}
            </p>
            <div className="ch-tutorials-help-links">
              <Button
                variant="secondary"
                onClick={() => navigate("/terms")}
                className="ch-tutorials-help-btn"
              >
                <Icon name="document" size={15} />
                <span>{t("tutorials.termsLink") || "Terms & Guidelines"}</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/privacy")}
                className="ch-tutorials-help-btn"
              >
                <Icon name="info" size={15} />
                <span>{t("tutorials.privacyLink") || "Privacy Policy (POPIA)"}</span>
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </MobileLayout>
  );
}