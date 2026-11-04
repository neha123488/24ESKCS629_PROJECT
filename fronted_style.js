const { useState, useEffect, useMemo } = React;
const h = React.createElement;
const API_BASE = "/api";

function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return localISODate();
}

function nextWorkingDayForDoctor(doctor, startDate) {
  if (!doctor) return startDate;
  const start = new Date(`${startDate}T00:00:00`);

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    const iso = localISODate(candidate);
    const weekday = new Date(`${iso}T00:00:00`).getDay();
    if (doctor.workDays.includes(weekday)) return iso;
  }

  return startDate;
}

function formatTime(time) {
  const [hh, mm] = time.split(":").map(Number);
  const period = hh >= 12 ? "pm" : "am";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")}${period}`;
}
function formatDate(date, opts) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, opts);
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = localStorage.getItem("medserveToken");
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const api = {
  getAccount: () => request("/auth/me"),
  getDoctors: () => request("/doctors"),
  getAvailability: (doctorId, date) => request(`/doctors/${doctorId}/availability?date=${date}`),
  getAppointments: (email) => request(`/appointments${email ? `?email=${encodeURIComponent(email)}` : ""}`),
  bookAppointment: (payload) => request("/appointments", { method: "POST", body: JSON.stringify(payload) }),
  cancelAppointment: (id) => request(`/appointments/${id}`, { method: "DELETE" })
};

function DoctorRail({ doctors, selectedId, onSelect }) {
  return h(
    "nav",
    { className: "doctor-rail", "aria-label": "Choose a doctor" },
    doctors.map((doc) =>
      h(
        "button",
        {
          key: doc.id,
          className: `doctor-item ${selectedId === doc.id ? "is-selected" : ""}`,
          style: { "--doc-color": doc.color },
          onClick: () => onSelect(doc.id)
        },
        h("span", { className: "doctor-item__mark" }),
        h(
          "span",
          { className: "doctor-item__text" },
          h("span", { className: "doctor-item__name" }, doc.name),
          h("span", { className: "doctor-item__specialty" }, doc.specialty)
        )
      )
    )
  );
}

function SlotGrid({ slots, loading, selectedTime, onSelect }) {
  if (loading) return h("p", { className: "muted" }, "Loading open times…");
  if (!slots.length)
    return h("p", { className: "muted" }, "This doctor doesn't work on the selected day. Try another date.");
  if (!slots.some((s) => s.available))
    return h("p", { className: "muted" }, "Fully booked for this day. Try another date.");

  return h(
    "div",
    { className: "slot-grid", role: "listbox", "aria-label": "Available times" },
    slots.map((slot) =>
      h(
        "button",
        {
          key: slot.time,
          type: "button",
          disabled: !slot.available,
          className: `slot ${selectedTime === slot.time ? "is-selected" : ""}`,
          onClick: () => onSelect(slot.time)
        },
        formatTime(slot.time)
      )
    )
  );
}

function BookingForm({ disabled, onSubmit }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ reason });
      setReason("");
    } finally {
      setSubmitting(false);
    }
  }

  return h(
    "form",
    { className: "booking-form", onSubmit: handleSubmit },
    h(
      "div",
      { className: "field" },
      h("label", { htmlFor: "reason" }, "Reason for visit (optional)"),
      h("textarea", {
        id: "reason",
        value: reason,
        onChange: (e) => setReason(e.target.value),
        placeholder: "Annual check-up, follow-up, new symptom…",
        rows: 3
      })
    ),
    h(
      "button",
      { type: "submit", className: "btn-primary", disabled: disabled || submitting },
      submitting ? "Booking…" : "Confirm appointment"
    )
  );
}

function AppointmentsList({ appointments, loading, onCancel }) {
  if (loading) return h("p", { className: "muted" }, "Looking up appointments…");
  if (!appointments.length) return h("p", { className: "muted" }, "No appointments found for that email yet.");

  return h(
    "ul",
    { className: "appointment-list" },
    appointments.map((a) =>
      h(
        "li",
        { key: a.id, className: `appointment-card ${a.status === "cancelled" ? "is-cancelled" : ""}` },
        h(
          "div",
          null,
          h("p", { className: "appointment-card__doctor" }, a.doctorName),
          h(
            "p",
            { className: "appointment-card__meta" },
            `${a.specialty} · ${formatDate(a.date, { weekday: "short", month: "short", day: "numeric" })} at ${formatTime(a.time)}`
          ),
          a.reason && h("p", { className: "appointment-card__reason" }, a.reason)
        ),
        a.status !== "cancelled" &&
          h("button", { className: "btn-text", onClick: () => onCancel(a.id) }, "Cancel")
      )
    )
  );
}

function App() {
  const [apiError, setApiError] = useState(false);
  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medserveAccount") || "null");
    } catch {
      return null;
    }
  });
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [banner, setBanner] = useState(null);

  const [lookupEmail, setLookupEmail] = useState("");
  const [myAppointments, setMyAppointments] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  useEffect(() => {
    const token = localStorage.getItem("medserveToken");
    if (!token) return;
    api.getAccount()
      .then((user) => {
        localStorage.setItem("medserveAccount", JSON.stringify(user));
        setAccount(user);
      })
      .catch(() => {
        localStorage.removeItem("medserveToken");
        localStorage.removeItem("medserveAccount");
        setAccount(null);
        window.dispatchEvent(new Event("medserve-account-change"));
      });
  }, []);

  useEffect(() => {
    api
      .getDoctors()
      .then((docs) => {
        setDoctors(docs);
        if (docs.length) {
          const firstDoctor = docs[0];
          setSelectedDoctorId(firstDoctor.id);
          setDate(nextWorkingDayForDoctor(firstDoctor, todayISO()));
        }
      })
      .catch(() => setApiError(true));
  }, []);

  useEffect(() => {
    if (!selectedDoctorId || !doctors.length) return;
    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    if (!doctor) return;

    const selectedWeekday = new Date(`${date}T00:00:00`).getDay();
    if (!doctor.workDays.includes(selectedWeekday)) {
      setDate(nextWorkingDayForDoctor(doctor, todayISO()));
    }
  }, [selectedDoctorId, doctors]);

  useEffect(() => {
    if (!selectedDoctorId || !date) return;
    setSlotsLoading(true);
    setSelectedTime(null);
    api
      .getAvailability(selectedDoctorId, date)
      .then((res) => setSlots(res.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDoctorId, date]);

  async function handleBook({ reason }) {
    if (!selectedDoctorId || !selectedTime) {
      setBanner({ type: "error", text: "Pick a time before confirming." });
      return;
    }
    try {
      await api.bookAppointment({ doctorId: selectedDoctorId, reason, date, time: selectedTime });
      const successText = `Appointment confirmed with ${selectedDoctor.name} on ${formatDate(date, { weekday: "long", month: "long", day: "numeric" })} at ${formatTime(selectedTime)}.`;
      setBanner({ type: "success", text: successText });
      window.alert(successText);
      setSelectedTime(null);
      const res = await api.getAvailability(selectedDoctorId, date);
      setSlots(res.slots);
      if (lookupEmail.toLowerCase() === account?.email.toLowerCase()) runLookup(account.email);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function runLookup(emailOverride) {
    const email = (emailOverride ?? lookupEmail).trim();
    if (!email) return;
    setLookupLoading(true);
    setHasLookedUp(true);
    try {
      setMyAppointments(await api.getAppointments(email));
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleCancel(id) {
    await api.cancelAppointment(id);
    setMyAppointments((prev) => prev.filter((a) => a.id !== id));
    if (selectedDoctorId && date) {
      const res = await api.getAvailability(selectedDoctorId, date);
      setSlots(res.slots);
    }
  }

  return h(
    "div",
    { className: "app", id: "booking" },
    h(
      "header",
      { className: "app-header" },
      h(
        "div",
        { className: "app-header__brand" },
        h("span", { className: "brand-mark", "aria-hidden": "true" }),
        h(
          "div",
          null,
          h("h1", null, "MedServe"),
          h("p", null, "Book time with your care team in a few clicks.")
        )
      )
    ),
    h(
      "section",
      { className: "booking-hero" },
      h("div", { className: "booking-hero__content" },
        h("span", { className: "eyebrow" }, "Patient-first care"),
        h("h2", null, "Your care, scheduled simply."),
        h("p", null, "Choose a doctor, pick a convenient time, and get the support you need in a calm, welcoming clinic environment.")
      ),
      h("div", { className: "booking-hero__stats" },
        h("div", { className: "stat-pill" }, h("strong", null, "12+"), h("span", null, "Years of experience")),
        h("div", { className: "stat-pill" }, h("strong", null, "8"), h("span", null, "Specialist doctors"))
      )
    ),
    apiError &&
      h(
        "p",
        { className: "api-warning" },
        "Can't reach the API at ",
        h("code", null, API_BASE),
        ". Start it from the project root with ",
        h("code", null, "node backend_server.js"),
        ", then reload this page."
      ),
    h(
      "main",
      { className: "app-layout" },
      h(
        "section",
        { className: "panel panel--rail" },
        h("h2", { className: "panel-title" }, "1. Choose a doctor"),
        h(DoctorRail, { doctors, selectedId: selectedDoctorId, onSelect: setSelectedDoctorId })
      ),
      h(
        "section",
        { className: "panel panel--booking" },
        h("h2", { className: "panel-title" }, "2. Pick a date and time"),
        h(
          "div",
          { className: "date-row" },
          h("label", { htmlFor: "date" }, "Date"),
          h("input", {
            id: "date",
            type: "date",
            min: todayISO(),
            value: date,
            onChange: (e) => setDate(e.target.value)
          })
        ),
        h(SlotGrid, { slots, loading: slotsLoading, selectedTime, onSelect: setSelectedTime }),
        h("h2", { className: "panel-title panel-title--spaced" }, "3. Your details"),
        banner && h("p", { className: `banner banner--${banner.type}` }, banner.text),
        account
          ? h(React.Fragment, null,
              h("p", { className: "account-session" }, `Booking as ${account.name} (${account.email})`,
                h("button", { type: "button", className: "btn-text", onClick: () => { localStorage.removeItem("medserveToken"); localStorage.removeItem("medserveAccount"); setAccount(null); window.dispatchEvent(new Event("medserve-account-change")); } }, "Log out")
              ),
              h(BookingForm, { disabled: !selectedTime, onSubmit: handleBook })
            )
          : h("div", { className: "booking-auth-required" },
              h("p", null, "Log in or create an account to book an appointment."),
              h("a", { className: "btn-primary", href: "account_medserve.html" }, "Log in / Sign up")
            )
      ),
      h(
        "section",
        { className: "panel panel--lookup" },
        h("h2", { className: "panel-title" }, "Your appointments"),
        h(
          "form",
          {
            className: "lookup-form",
            onSubmit: (e) => {
              e.preventDefault();
              runLookup();
            }
          },
          h("input", {
            type: "email",
            placeholder: "Enter your email",
            value: lookupEmail,
            onChange: (e) => setLookupEmail(e.target.value),
            required: true
          }),
          h("button", { type: "submit", className: "btn-secondary" }, "Find")
        ),
        hasLookedUp && h(AppointmentsList, { appointments: myAppointments, loading: lookupLoading, onCancel: handleCancel })
      )
    )
  );
}

window.MedServeBooking = App;
