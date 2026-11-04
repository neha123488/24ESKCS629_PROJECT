(() => {
const h = React.createElement;
const API_BASE = "/api";

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

const doctors = [
  { name: "Dr. Amara Okafor", specialty: "General Practice", description: "Expert in preventive care, wellness planning, and routine consultations for adults and families.", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80" },
  { name: "Dr. Liam Chen", specialty: "Cardiology", description: "Helps patients manage heart health through detailed assessment, treatment planning, and ongoing support.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=80" },
  { name: "Dr. Sofia Reyes", specialty: "Dermatology", description: "Focused on skin conditions, skincare guidance, and personalized treatment strategies that work.", image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=900&q=80" },
  { name: "Dr. Noah Berg", specialty: "Pediatrics", description: "Delivers compassionate, family-centered healthcare for children and young patients.", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80" },
  { name: "Dr. Priya Sharma", specialty: "Internal Medicine", description: "Manages chronic conditions and preventive care with a holistic, patient-centered approach.", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80" },
  { name: "Dr. Javier Mendez", specialty: "Orthopedics", description: "Specializes in mobility care, injury treatment, and rehabilitation planning for active lifestyles.", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=900&q=80" },
  { name: "Dr. Elaine Kim", specialty: "Neurology", description: "Provides advanced evaluation and care plans for neurological health and long-term symptom management.", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80" },
  { name: "Dr. Mason Hughes", specialty: "Family Medicine", description: "Supports individuals and families with everyday care, checkups, and integrative health guidance.", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80" }
];

const services = [
  { icon: "+", title: "Primary Care", text: "Routine checkups, preventive visits, health screenings, and personalized guidance for long-term wellness." },
  { icon: "❤", title: "Cardiology", text: "Heart health consultations, risk assessment, ongoing monitoring, and treatment planning for cardiovascular wellness." },
  { icon: "✦", title: "Dermatology", text: "Skin health evaluations, treatment for rashes and acne, and preventive strategies for healthier skin." },
  { icon: "👶", title: "Pediatrics", text: "Gentle, thoughtful care for growing children, from wellness visits to condition management and support." },
  { icon: "⚕", title: "Follow-up Care", text: "Clear recovery plans, medication review, and condition tracking to help patients stay on the right path." },
  { icon: "✓", title: "Preventive Care", text: "Early detection, screening programs, and proactive advice that helps reduce future health risks." }
];

function getSavedAccount() {
  try {
    if (!localStorage.getItem("medserveToken")) return null;
    return JSON.parse(localStorage.getItem("medserveAccount") || "null");
  } catch {
    return null;
  }
}

function SiteHeader({ currentPage }) {
  const [account, setAccount] = React.useState(getSavedAccount);
  const links = [
    ["frontend_style.html", "Book appointment", "booking"],
    ["about_medserve.html", "About MedServe", "about"],
    ["services_medserve.html", "Services", "services"],
    ["team_medserve.html", "Doctors", "team"],
    ["feedback_medserve.html", "Feedback", "feedback"],
    ["contact_medserve.html", "Contact", "contact"],
    ["account_medserve.html", "Log in / Sign up", "account"]
  ];

  React.useEffect(() => {
    const syncAccount = () => setAccount(getSavedAccount());
    window.addEventListener("storage", syncAccount);
    window.addEventListener("medserve-account-change", syncAccount);
    return () => {
      window.removeEventListener("storage", syncAccount);
      window.removeEventListener("medserve-account-change", syncAccount);
    };
  }, []);

  return h(
    "div",
    { className: "site-topbar" },
    h(
      "div",
      { className: "site-topbar__inner" },
      h("a", { className: "brand-mini", href: "frontend_style.html" }, "MedServe"),
      h(
        "nav",
        { className: "site-nav", "aria-label": "Main navigation" },
        links.slice(0, -1).map(([href, label, page]) => h(
          "a",
          { key: href, href, ...(currentPage === page ? { "aria-current": "page" } : {}) },
          label
        )),
        account
          ? h("details", { className: "site-account-menu" },
              h("summary", {
                className: "site-account-trigger",
                "aria-label": `Profile for ${account.name}`,
                title: "View profile"
              }, h("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" },
                h("circle", { cx: "12", cy: "8", r: "3" }),
                h("path", { d: "M5.5 20a6.5 6.5 0 0 1 13 0" })
              )),
              h("div", { className: "site-account-popover" },
                h("strong", null, account.name),
                h("span", null, account.email)
              )
            )
          : h("a", {
              key: "account_medserve.html",
              href: "account_medserve.html",
              ...(currentPage === "account" ? { "aria-current": "page" } : {})
            }, "Log in / Sign up")
      )
    )
  );
}

function BookingLanding() {
  return h(React.Fragment, null,
    h("main", { className: "site-landing", "aria-label": "MedServe overview" },
      h("section", { className: "landing-hero" },
        h("div", { className: "landing-copy" },
          h("div", { className: "brand-block large-brand", "aria-label": "MedServe logo and name" },
            h("span", { className: "brand-logo", "aria-hidden": "true" }, "+"),
            h("span", { className: "brand-mini" }, "MedServe")
          ),
          h("span", { className: "eyebrow" }, "Trusted care for every stage of life"),
          h("h1", null, "Modern healthcare, designed around your comfort."),
          h("p", null, "MedServe brings together compassionate doctors, preventive care, and a smooth digital experience so every visit feels personal, clear, and reassuring."),
          h("div", { className: "landing-actions" },
            h("a", { className: "btn-primary", href: "#booking" }, "Book an appointment"),
            h("a", { className: "btn-secondary", href: "about_medserve.html" }, "Learn more")
          ),
          h("ul", { className: "mini-trust", "aria-label": "Trust indicators" },
            h("li", null, "Same-week visits"),
            h("li", null, "Friendly specialists"),
            h("li", null, "Patient-first support")
          )
        ),
        h("div", { className: "landing-panel", "aria-label": "Clinic overview" },
          h("div", { className: "panel-card panel-card--highlight" }, h("strong", null, "12+"), h("span", null, "Years of trusted care")),
          h("div", { className: "panel-card" }, h("strong", null, "8"), h("span", null, "Specialist doctors")),
          h("div", { className: "panel-card" }, h("strong", null, "1,500+"), h("span", null, "Patients supported"))
        )
      ),
      h("section", { className: "feature-band", "aria-label": "Key healthcare services" },
        h("article", { className: "feature-card" }, h("h3", null, "Primary care"), h("p", null, "Routine checkups, screenings, and care plans that keep you feeling your best.")),
        h("article", { className: "feature-card" }, h("h3", null, "Specialist support"), h("p", null, "Guidance from experienced clinicians across medicine, diagnostics, and follow-up.")),
        h("article", { className: "feature-card" }, h("h3", null, "Preventive health"), h("p", null, "Early detection, proactive advice, and practical steps for long-term wellness."))
      ),
      h("section", { className: "experience-grid", "aria-label": "Patient experience highlights" },
        h("div", { className: "experience-copy" },
          h("span", { className: "eyebrow" }, "Why patients choose MedServe"),
          h("h2", null, "Calm, efficient care from a team that listens."),
          h("p", null, "We combine modern convenience with a warm clinical approach, giving every patient clear communication, thoughtful treatment, and a smoother experience from first visit to follow-up.")
        ),
        h("div", { className: "experience-points" },
          h("div", null, h("strong", null, "01"), h("span", null, "Personalized treatment pathways")),
          h("div", null, h("strong", null, "02"), h("span", null, "Clear appointment scheduling and follow-ups")),
          h("div", null, h("strong", null, "03"), h("span", null, "Comfortable environment and attentive staff"))
        )
      ),
      h("section", { className: "testimonial-strip", "aria-label": "Patient feedback summary" },
        h("p", null, "“The environment is calm, the doctors are kind, and the whole process feels easy from start to finish.”"),
        h("span", null, "— Sarah M., patient")
      )
    ),
    h(window.MedServeBooking),
    h("footer", { className: "site-footer" },
      h("div", { className: "site-footer__content" },
        h("div", null, h("span", { className: "brand-mini" }, "MedServe"), h("p", null, "Compassionate, modern care for healthier everyday life.")),
        h("div", null, h("h4", null, "Visit"), h("p", null, "24 Health Avenue", h("br"), "Greenwood Medical District")),
        h("div", null, h("h4", null, "Contact"), h("p", null, "hello@medserveclinic.com", h("br"), "+1 (415) 284-3010"))
      )
    )
  );
}

function AboutPage() {
  const featuredDoctors = [
    { ...doctors[0], description: "Focused on preventive care, long-term wellness, and everyday health guidance." },
    { ...doctors[1], description: "Specializes in heart health, risk management, and personalized cardiovascular care." },
    { ...doctors[2], description: "Helps patients treat skin concerns with gentle, evidence-based care and prevention." }
  ];
  const stats = [
    ["12+", "Years of experience"],
    ["4", "Specialist doctors"],
    ["100%", "Patient-focused care"],
    ["24/7", "Support mindset"]
  ];

  return h(
    "main",
    { className: "about-page" },
    h(
      "section",
      { className: "about-hero" },
      h(
        "div",
        null,
        h("h1", null, "Healthcare designed around comfort, trust, and outcomes."),
        h("p", null, "MedServe is a modern care experience built for patients who want compassionate, efficient, and expert-led treatment. From first consultation to follow-up care, we focus on delivering a supportive environment where your health always comes first."),
        h("div", { className: "cta-row" },
          h("a", { className: "primary-btn", href: "frontend_style.html" }, "Book an appointment"),
          h("a", { className: "secondary-btn", href: "#team" }, "Meet our doctors")
        )
      ),
      h("div", { className: "hero-visual", role: "img", "aria-label": "Medical clinic environment" })
    ),
    h("section", { className: "feature-grid" },
      h("article", { className: "info-card" }, h("h3", null, "Our services"), h("p", null, "We provide general consultations, preventive screenings, chronic care management, follow-up visits, specialist referrals, and personalized treatment planning tailored to each patient.")),
      h("article", { className: "info-card" }, h("h3", null, "How patients are treated"), h("p", null, "Every patient is treated with dignity, clarity, and respect. We listen carefully, explain diagnoses in simple terms, and create treatment plans that align with your personal health goals.")),
      h("article", { className: "info-card" }, h("h3", null, "Our doctors"), h("p", null, "Our medical team brings together experienced physicians across general practice, cardiology, dermatology, and pediatrics to provide skilled, compassionate care for every stage of life."))
    ),
    h("section", { id: "team", className: "info-card" },
      h("h3", null, "Comfortable, safe, and welcoming environment"),
      h("p", null, "Our clinic is designed to make every visit feel calm and reassuring. We maintain a clean, modern, and patient-first environment with a focus on privacy, accessibility, and a smooth care journey.")
    ),
    h("section", { className: "doctor-grid", "aria-label": "Medical team" }, featuredDoctors.map((doctor) => h(
      "article",
      { className: "doctor-card", key: doctor.name },
      h("div", { className: "doctor-photo", role: "img", "aria-label": `Portrait of ${doctor.name}`, style: { backgroundImage: `url('${doctor.image}')` } }),
      h("div", { className: "doctor-card__body" }, h("h4", null, doctor.name), h("div", { className: "doctor-card__role" }, doctor.specialty), h("p", null, doctor.description))
    ))),
    h("section", { className: "testimonial" },
      h("p", null, "“MedServe made my care feel personal from the very first visit. The team listened, explained everything clearly, and made me feel completely comfortable throughout treatment.”"),
      h("strong", null, "— A grateful patient")
    ),
    h("section", { className: "stats-row", "aria-label": "MedServe statistics" }, stats.map(([value, label]) => h(
      "div",
      { className: "stat", key: label },
      h("strong", null, value),
      h("span", null, label)
    )))
  );
}

function ServicesPage() {
  return h("main", { className: "page-shell" },
    h("section", { className: "page-hero" },
      h("h1", null, "Healthcare services built around your life."),
      h("p", null, "From everyday medical needs to specialized care, MedServe provides clear guidance, expert treatment, and a smoother patient experience.")
    ),
    h("section", { className: "service-grid" }, services.map((service) => h(
      "article",
      { className: "service-box", key: service.title },
      h("div", { className: "icon", "aria-hidden": "true" }, service.icon),
      h("h3", null, service.title),
      h("p", null, service.text)
    ))),
    h("section", { className: "cta-box" },
      h("h3", null, "Need expert support?"),
      h("p", null, "Speak with our team and schedule the right appointment for your needs."),
      h("a", { className: "primary-btn", href: "frontend_style.html" }, "Book appointment")
    )
  );
}

function DoctorsPage() {
  return h("main", { className: "page-shell" },
    h("section", { className: "page-hero" },
      h("h1", null, "Meet the medical team."),
      h("p", null, "Our doctors combine clinical skill, empathy, and a patient-first approach to help you feel confident about every step of care.")
    ),
    h("section", { className: "doctor-grid" }, doctors.map((doctor) => h(
      "article",
      { className: "doctor-card", key: doctor.name },
      h("div", { className: "doctor-photo", role: "img", "aria-label": `Portrait of ${doctor.name}`, style: { backgroundImage: `url('${doctor.image}')` } }),
      h("div", { className: "doctor-info" },
        h("h3", null, doctor.name),
        h("div", { className: "role" }, doctor.specialty),
        h("p", null, doctor.description)
      )
    )))
  );
}

function ContactPage() {
  const [status, setStatus] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSubmitting(true);
    setStatus(null);
    try {
      await postJson("/contacts", {
        name: String(values.get("name")).trim(),
        email: String(values.get("email")).trim(),
        message: String(values.get("message")).trim()
      });
      setStatus({ success: true, text: "Your message has been sent successfully." });
      form.reset();
    } catch (error) {
      setStatus({ success: false, text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return h("main", { className: "page-shell" },
    h("div", { className: "contact-wrap" },
      h("section", { className: "panel" },
        h("h1", null, "Contact MedServe"),
        h("p", null, "We’re here to help you with appointments, questions, and supportive care guidance."),
        h("ul", null,
          h("li", null, "Phone: +1 (555) 210-7811"),
          h("li", null, "Email: hello@medserveclinic.com"),
          h("li", null, "Address: 245 Wellness Avenue, Greenfield"),
          h("li", null, "Hours: Mon - Sat, 8:00 AM - 6:00 PM")
        )
      ),
      h("section", { className: "panel" },
        h("h2", null, "Ask a question"),
        h("form", { className: "contact-form", onSubmit: submit },
          h("label", { htmlFor: "contactName" }, "Your name"),
          h("input", { id: "contactName", name: "name", type: "text", placeholder: "Your name", autoComplete: "name", required: true }),
          h("label", { htmlFor: "contactEmail" }, "Your email"),
          h("input", { id: "contactEmail", name: "email", type: "email", placeholder: "Your email", autoComplete: "email", required: true }),
          h("label", { htmlFor: "contactMessage" }, "Message"),
          h("textarea", { id: "contactMessage", name: "message", placeholder: "How can we help?", required: true }),
          h("button", { className: "btn-primary", type: "submit", disabled: submitting }, submitting ? "Sending…" : "Send message"),
          h("p", { role: "status", "aria-live": "polite", style: { color: status?.success ? "var(--teal)" : "#b91c1c", fontWeight: 600, minHeight: "1.2em" } }, status?.text || "")
        )
      )
    )
  );
}

function FeedbackPage() {
  const [rating, setRating] = React.useState(0);
  const [status, setStatus] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const ratingLabels = ["Not rated yet", "Poor", "Fair", "Good", "Very good", "Excellent"];
  const reviews = [
    ["Warm and caring", "“The staff were kind, organized, and genuinely caring. I felt heard and respected from the beginning.”", "— Rachel M."],
    ["Very professional", "“The doctor explained everything clearly and gave me confidence in my treatment plan.”", "— Daniel T."],
    ["Clean and calm", "“The environment was clean, welcoming, and soothing. It made my visit much less stressful.”", "— Sophia L."]
  ];

  async function submit(event) {
    event.preventDefault();
    if (!rating) {
      setStatus({ success: false, text: "Please choose a rating before submitting." });
      return;
    }
    const form = event.currentTarget;
    const values = new FormData(form);
    setSubmitting(true);
    setStatus(null);
    try {
      await postJson("/feedbacks", {
        name: String(values.get("name")).trim(),
        email: String(values.get("email")).trim(),
        feedback: String(values.get("feedback")).trim(),
        rating
      });
      setStatus({ success: true, text: "Thank you! Your feedback has been saved." });
      form.reset();
      setRating(0);
    } catch (error) {
      setStatus({ success: false, text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return h("main", { className: "page-shell" },
    h("section", { className: "page-hero" },
      h("h1", null, "Patient feedback"),
      h("p", null, "We value every experience and use patient feedback to strengthen the quality of care we provide.")
    ),
    h("section", { className: "review-summary" },
      h("div", { className: "rating-box" },
        h("span", null, "Average rating"), h("strong", null, "4.9"), h("div", { className: "stars", "aria-label": "4.9 out of 5 stars" }, "★★★★★"), h("span", null, "Based on 1,240 patient reviews")
      ),
      h("div", { className: "review-grid" }, reviews.map(([title, quote, person]) => h(
        "article",
        { className: "review-card", key: title },
        h("h3", null, title), h("p", null, quote), h("div", { className: "person" }, person)
      )))
    ),
    h("section", { className: "feedback-form" },
      h("h2", null, "Share your experience"),
      h("form", { className: "form-grid", onSubmit: submit },
        h("div", { className: "field" }, h("label", { htmlFor: "feedbackName" }, "Your name"), h("input", { id: "feedbackName", name: "name", type: "text", placeholder: "Enter your name", autoComplete: "name", required: true })),
        h("div", { className: "field" }, h("label", { htmlFor: "feedbackEmail" }, "Email"), h("input", { id: "feedbackEmail", name: "email", type: "email", placeholder: "Enter your email", autoComplete: "email", required: true })),
        h("div", { className: "field", style: { gridColumn: "1 / -1" } }, h("label", { htmlFor: "feedbackText" }, "Your feedback"), h("textarea", { id: "feedbackText", name: "feedback", placeholder: "Tell us about your experience...", required: true })),
        h("div", { className: "field", style: { gridColumn: "1 / -1" } },
          h("div", { className: "rating-row" },
            h("span", null, "Rating:"),
            h("div", { className: "star-rating", "aria-label": "Choose a rating", role: "group" }, [1, 2, 3, 4, 5].map((value) => h(
              "button",
              { className: `star ${value <= rating ? "active" : ""}`, type: "button", key: value, "aria-label": `${value} ${value === 1 ? "star" : "stars"}`, "aria-pressed": value === rating, onClick: () => { setRating(value); setStatus(null); } },
              "★"
            ))),
            h("span", { className: "selected-rating" }, ratingLabels[rating])
          )
        ),
        h("div", { style: { gridColumn: "1 / -1" } }, h("button", { className: "btn-primary", type: "submit", disabled: submitting }, submitting ? "Submitting…" : "Submit feedback")),
        h("p", { role: "status", "aria-live": "polite", style: { gridColumn: "1 / -1", color: status?.success ? "var(--teal)" : "#b91c1c", fontWeight: 600, minHeight: "1.2em" } }, status?.text || "")
      )
    )
  );
}

function AccountPage() {
  const [mode, setMode] = React.useState("login");
  const [status, setStatus] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`${API_BASE}/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          password: values.get("password")
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Account request failed");
      localStorage.setItem("medserveToken", data.token);
      localStorage.setItem("medserveAccount", JSON.stringify(data.user));
      setStatus("Signed in. Returning to appointment booking…");
      window.location.href = "frontend_style.html#booking";
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function selectMode(nextMode) {
    setMode(nextMode);
    setStatus("");
  }

  return h("main", { className: "account-page" },
    h("section", { className: "account-layout", "aria-label": "MedServe account access" },
      h("div", { className: "account-story" },
        h("a", { className: "account-story__brand", href: "frontend_style.html" }, "MedServe"),
        h("div", { className: "account-story__copy" },
          h("h1", null, "Care that feels a little closer."),
          h("p", null, "One place for thoughtful care, trusted clinicians, and the next step in your health journey.")
        )
      ),
      h("div", { className: "account-form-side" },
        h("div", { className: "account-form-wrap" },
          h("h2", null, isSignup ? "Create your account" : "Welcome back"),
          h("p", { className: "account-intro" }, isSignup ? "A simpler way to stay connected to your care." : "Sign in with your email and password."),
          h("div", { className: "account-tabs", role: "tablist", "aria-label": "Account access" },
            h("button", { className: "account-tab", type: "button", role: "tab", "aria-selected": !isSignup, onClick: () => selectMode("login") }, "Log in"),
            h("button", { className: "account-tab", type: "button", role: "tab", "aria-selected": isSignup, onClick: () => selectMode("signup") }, "Create account")
          ),
          h("form", { className: "account-form", onSubmit: submit },
            isSignup && h("div", { className: "account-field" }, h("label", { htmlFor: "full-name" }, "Full name"), h("input", { id: "full-name", name: "name", type: "text", autoComplete: "name", placeholder: "Your full name", required: true })),
            h("div", { className: "account-field" }, h("label", { htmlFor: "account-email" }, "Email address"), h("input", { id: "account-email", name: "email", type: "email", autoComplete: "email", placeholder: "you@example.com", required: true })),
            h("div", { className: "account-field" }, h("label", { htmlFor: "account-password" }, "Password"), h("input", { id: "account-password", name: "password", type: "password", autoComplete: isSignup ? "new-password" : "current-password", minLength: isSignup ? 8 : undefined, maxLength: 128, required: true })),
            h("button", { className: "account-submit", type: "submit", disabled: submitting }, submitting ? "Please wait…" : isSignup ? "Create account" : "Log in")
          ),
          h("p", { className: "account-status", role: "status", "aria-live": "polite" }, status),
          h("a", { className: "account-back", href: "frontend_style.html" }, "← Back to appointments")
        )
      )
    )
  );
}

const pageComponents = {
  booking: BookingLanding,
  about: AboutPage,
  services: ServicesPage,
  team: DoctorsPage,
  contact: ContactPage,
  feedback: FeedbackPage,
  account: AccountPage
};

const root = document.getElementById("root");
const Page = pageComponents[root.dataset.page];
ReactDOM.createRoot(root).render(h(React.Fragment, null, h(SiteHeader, { currentPage: root.dataset.page }), h(Page)));
})();
