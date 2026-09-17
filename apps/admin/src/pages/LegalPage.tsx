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
        These Terms of Service ("Terms") govern access to and use of the Monark Health admin portal
        by clinic staff and administrators ("you"). By signing in, you agree to these Terms.
      </p>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>1. Purpose of the Service</h2>
        <p style={bodyStyle}>
          Monark Health provides tools for clinics to manage patient health profiles, generate
          personalised wellness plans, and track patient progress. It is a clinical support tool,
          not a substitute for professional medical judgment.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>2. Authorized Use</h2>
        <p style={bodyStyle}>
          Access is limited to authorized clinic personnel. You are responsible for maintaining the
          confidentiality of your credentials and for all activity under your account. Do not share
          login credentials or access patient records outside the scope of your clinical duties.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>3. Patient Data Responsibilities</h2>
        <p style={bodyStyle}>
          You must handle patient health information in accordance with applicable law and your
          clinic's own privacy obligations to its patients. All access to patient records is logged
          for audit purposes.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>4. AI-Generated Plans</h2>
        <p style={bodyStyle}>
          Wellness and exercise plans are generated with AI assistance based on data entered into the
          system. Generated plans must be reviewed by qualified clinical staff before being shared
          with patients and do not constitute medical advice on their own.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>5. Service Availability</h2>
        <p style={bodyStyle}>
          The service is provided on an "as available" basis. Features, availability, and these Terms
          may change; continued use after changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>6. Contact</h2>
        <p style={bodyStyle}>Questions about these Terms can be directed to your clinic administrator.</p>
      </section>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p style={bodyStyle}>
        This Privacy Policy explains how Monark Health collects, uses, and protects information
        within the admin portal.
      </p>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>1. Information We Collect</h2>
        <p style={bodyStyle}>
          Account information (name, email, role) for clinic staff, and patient health information
          entered by staff, including demographics, clinical measurements, lab values, medications,
          allergies, and daily tracking data.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>2. How Data Is Protected</h2>
        <p style={bodyStyle}>
          Sensitive clinical fields (lab values, medications, conditions, allergies) are encrypted at
          rest with AES-256-GCM in addition to the database provider's own encryption at rest and TLS
          in transit. Access is authenticated, role-restricted, and every view or change to a
          patient's health profile is recorded in an audit log.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>3. How Data Is Used</h2>
        <p style={bodyStyle}>
          Patient health data is used to calculate clinical metrics (BMI, BMR, calorie/macro targets)
          and to generate personalised wellness plans via a third-party AI provider. Data sent to the
          AI provider is limited to what is necessary to generate the plan.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>4. Data Retention</h2>
        <p style={bodyStyle}>
          Data is retained for as long as the patient's account remains active with the clinic, or as
          required by applicable record-keeping obligations, after which it may be archived or deleted
          on request.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>5. Your Choices</h2>
        <p style={bodyStyle}>
          Clinic administrators can update or remove a patient's health profile at the patient's
          request, subject to the clinic's own record-keeping obligations.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>6. Contact</h2>
        <p style={bodyStyle}>Questions about this policy can be directed to your clinic administrator.</p>
      </section>
    </>
  );
}

export function LegalPage() {
  const location = useLocation();
  const { user } = useAuth();
  const isPrivacy = location.pathname.includes("privacy");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "48px 24px",
        background: "var(--gradient-auth)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 680 }}>
        <Link
          to={user ? "/settings" : "/login"}
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
          <ArrowLeft size={14} strokeWidth={1.5} /> {user ? "Back to Settings" : "Back to sign in"}
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
