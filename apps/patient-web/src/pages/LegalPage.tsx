import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "../lib/auth";
import { Card } from "../components/ui";

const EFFECTIVE_DATE = "September 17, 2026";

const sectionStyle: React.CSSProperties = { marginTop: 24 };
const headingStyle: React.CSSProperties = { fontSize: 16, marginBottom: 8, color: "var(--color-text-primary)" };
const bodyStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)" };

function TermsContent() {
  return (
    <>
      <p style={bodyStyle}>
        These Terms of Service ("Terms") govern your use of the Monark Health patient app. By
        creating an account or signing in, you agree to these Terms.
      </p>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>1. What Monark Health Is</h2>
        <p style={bodyStyle}>
          Monark Health helps you track daily meals, workouts, water intake, and progress toward a
          90-day wellness plan created with your clinic. It is a wellness support tool and does not
          replace professional medical advice, diagnosis, or treatment.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>2. Your Account</h2>
        <p style={bodyStyle}>
          Your account is created by your clinic. You're responsible for keeping your login
          credentials confidential and for the accuracy of the health information you enter, such as
          daily logs and profile updates.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>3. Your Wellness Plan</h2>
        <p style={bodyStyle}>
          Diet and exercise plans are generated with AI assistance based on the health information on
          file and reviewed by your clinic. Always consult your clinician before making significant
          changes based on your plan, especially if you have a medical condition.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>4. Emergencies</h2>
        <p style={bodyStyle}>
          Monark Health is not for emergencies. If you are experiencing a medical emergency, contact
          your local emergency services immediately.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>5. Changes</h2>
        <p style={bodyStyle}>
          These Terms may be updated from time to time. Continued use of the app after changes take
          effect means you accept the updated Terms.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>6. Contact</h2>
        <p style={bodyStyle}>Questions about these Terms can be directed to your clinic.</p>
      </section>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p style={bodyStyle}>
        This Privacy Policy explains what information Monark Health collects about you and how it's
        used and protected.
      </p>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>1. Information We Collect</h2>
        <p style={bodyStyle}>
          Your profile (name, date of birth, gender), health information entered by you or your
          clinic (height, weight, lab values, medications, allergies, medical conditions), and daily
          activity you log (meals, exercise, water, mood, energy, weight).
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>2. How Your Data Is Protected</h2>
        <p style={bodyStyle}>
          Sensitive clinical information — lab values, medications, conditions, and allergies — is
          encrypted at rest with AES-256-GCM, in addition to standard database encryption and TLS in
          transit. Every view or update to your health profile is logged for audit purposes.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>3. How Your Data Is Used</h2>
        <p style={bodyStyle}>
          Your health data is used to calculate clinical metrics and generate your personalised
          wellness plan, which involves sending the relevant clinical details to a third-party AI
          provider solely to generate that plan.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>4. Who Can See Your Data</h2>
        <p style={bodyStyle}>
          Your data is visible to authorized staff at the clinic that created your account. It is not
          sold or shared with third parties for marketing.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>5. Your Choices</h2>
        <p style={bodyStyle}>
          You can request access to, correction of, or deletion of your data by contacting your
          clinic, subject to their own record-keeping obligations.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>6. Contact</h2>
        <p style={bodyStyle}>Questions about this policy can be directed to your clinic.</p>
      </section>
    </>
  );
}

export default function LegalPage() {
  const location = useLocation();
  const { accessToken } = useAuth();
  const isPrivacy = location.pathname.includes("privacy");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "clamp(20px, 4vw, 48px)",
        background: "var(--gradient-auth)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 680 }}>
        <Link
          to={accessToken ? "/profile" : "/login"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--color-text-secondary)",
            marginBottom: 20,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} /> {accessToken ? "Back to Profile" : "Back to sign in"}
        </Link>

        <Card>
          <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
            <Link
              to="/terms"
              style={{ fontSize: 13, fontWeight: 600, color: isPrivacy ? "var(--color-text-muted)" : "var(--color-primary)", textDecoration: "none" }}
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              style={{ fontSize: 13, fontWeight: 600, color: isPrivacy ? "var(--color-primary)" : "var(--color-text-muted)", textDecoration: "none" }}
            >
              Privacy Policy
            </Link>
          </div>
          <h1 style={{ fontSize: 22, marginTop: 12 }}>{isPrivacy ? "Privacy Policy" : "Terms of Service"}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>Effective {EFFECTIVE_DATE}</p>

          {isPrivacy ? <PrivacyContent /> : <TermsContent />}
        </Card>
      </div>
    </div>
  );
}
