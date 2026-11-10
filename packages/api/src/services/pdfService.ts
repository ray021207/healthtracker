import PDFDocument from "pdfkit";

interface PlanContext {
  patientName: string;
  clinicName?: string;
  startDate: Date;
  totalDays: number;
  dietPlan: unknown[];
  exercisePlan: unknown[];
  ayurvedicNotes?: unknown;
}

function toBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.end();
  });
}

function printSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor("#0B3D2E").text(title);
  doc.moveDown(0.2);
  doc.fontSize(11).fillColor("#111111");
}

export async function generateDietPDF(context: PlanContext): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.fontSize(24).fillColor("#0B3D2E").text("HECOS - Diet Plan", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).fillColor("#111111").text(`Patient: ${context.patientName}`);
  doc.text(`Plan Start: ${context.startDate.toDateString()}`);
  doc.text(`Total Days: ${context.totalDays}`);
  doc.text(`Clinic: ${context.clinicName ?? "HECOS"}`);

  printSectionTitle(doc, "Wellness Notes & Disclaimer");
  doc
    .fontSize(10)
    .text(
      "Wellness suggestion only - not a medical prescription. Consult your physician before use.",
    );

  const notes = Array.isArray(context.ayurvedicNotes) ? context.ayurvedicNotes : [];
  if (notes.length > 0) {
    doc.moveDown(0.5);
    for (const item of notes.slice(0, 12)) {
      const recommendation = item as { name?: string; suggestion?: string; disclaimer?: string };
      doc.text(`- ${recommendation.name ?? "Wellness"}: ${recommendation.suggestion ?? ""}`);
      if (recommendation.disclaimer) {
        doc.text(`  ${recommendation.disclaimer}`);
      }
    }
  }

  const dietDays = Array.isArray(context.dietPlan) ? context.dietPlan : [];
  for (let i = 0; i < dietDays.length; i += 7) {
    doc.addPage();
    printSectionTitle(doc, `Diet Week ${Math.floor(i / 7) + 1}`);

    for (const day of dietDays.slice(i, i + 7)) {
      const value = day as {
        day?: number;
        totalCalories?: number;
        meals?: Record<string, { name?: string; calories?: number; giIndex?: number }>;
        hydrationLitres?: number;
      };

      doc.fontSize(12).fillColor("#0B3D2E").text(`Day ${value.day ?? "-"}`);
      doc
        .fontSize(10)
        .fillColor("#111111")
        .text(`Calories: ${value.totalCalories ?? "-"} | Hydration: ${value.hydrationLitres ?? "-"} L`);

      const meals = value.meals ?? {};
      for (const [mealName, meal] of Object.entries(meals)) {
        doc.text(
          `  ${mealName}: ${meal?.name ?? "-"} (${meal?.calories ?? "-"} kcal, GI ${meal?.giIndex ?? "-"})`,
        );
      }

      doc.moveDown(0.3);
    }
  }

  return toBuffer(doc);
}

export async function generateExercisePDF(context: PlanContext): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.fontSize(24).fillColor("#0B3D2E").text("HECOS - Exercise Plan", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).fillColor("#111111").text(`Patient: ${context.patientName}`);
  doc.text(`Program Length: ${context.totalDays} days`);

  printSectionTitle(doc, "Program Phases");
  doc.text("Foundation: Days 1-30 (low intensity)");
  doc.text("Build: Days 31-60 (moderate intensity)");
  doc.text("Peak: Days 61-90 (progressive overload)");

  const exerciseDays = Array.isArray(context.exercisePlan) ? context.exercisePlan : [];

  for (let i = 0; i < exerciseDays.length; i += 7) {
    doc.addPage();
    printSectionTitle(doc, `Exercise Week ${Math.floor(i / 7) + 1}`);

    for (const day of exerciseDays.slice(i, i + 7)) {
      const value = day as {
        day?: number;
        phase?: string;
        isRestDay?: boolean;
        totalDurationMinutes?: number;
        exercises?: Array<{ name?: string; sets?: number; reps?: number; durationMinutes?: number }>;
      };

      doc
        .fontSize(12)
        .fillColor("#0B3D2E")
        .text(`Day ${value.day ?? "-"} (${value.phase ?? "phase"})${value.isRestDay ? " - Rest" : ""}`);

      doc
        .fontSize(10)
        .fillColor("#111111")
        .text(`Duration: ${value.totalDurationMinutes ?? 0} minutes`);

      const exercises = value.exercises ?? [];
      for (const exercise of exercises.slice(0, 8)) {
        doc.text(
          `  - ${exercise.name ?? "Exercise"} | sets ${exercise.sets ?? "-"} | reps ${exercise.reps ?? "-"} | duration ${exercise.durationMinutes ?? "-"}`,
        );
      }

      doc.moveDown(0.3);
    }
  }

  return toBuffer(doc);
}
