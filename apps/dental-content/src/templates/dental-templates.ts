type DentalCategory = "before_after" | "patient_testimonial" | "procedure_education" | "team_showcase" | "clinic_tour" | "dental_tip" | "promotion" | "event" | "technology";
type Platform = "facebook" | "instagram" | "tiktok" | "youtube" | "twitter";

export interface DentalTemplate {
  id: string;
  name: string;
  category: DentalCategory;
  platforms: Platform[];
  templateRo: string;
  templateEn: string;
  templateDe: string;
  variables: string[];
  cmsrApproved: boolean;
}

export const DENTAL_TEMPLATES: DentalTemplate[] = [
  {
    id: "allonx-before-after",
    name: "All-on-X Before/After",
    category: "before_after",
    platforms: ["facebook", "instagram"],
    templateRo: "Transformare One Step All-on-X — de la {{problem}} la zâmbet complet în 5 zile.",
    templateEn: "One Step All-on-X Transformation — from {{problem}} to a full smile in 5 days.",
    templateDe: "One Step All-on-X Transformation — von {{problem}} zum Lächeln in 5 Tagen.",
    variables: ["problem", "patient_story", "procedure_name", "duration", "result"],
    cmsrApproved: true,
  },
  {
    id: "dental-tip-weekly",
    name: "Sfat Dental Săptămânal",
    category: "dental_tip",
    platforms: ["facebook", "instagram", "tiktok"],
    templateRo: "Știai că {{fact}}? {{explanation}} {{actionable_tip}}",
    templateEn: "Did you know that {{fact}}? {{explanation}} {{actionable_tip}}",
    templateDe: "Wussten Sie, dass {{fact}}? {{explanation}} {{actionable_tip}}",
    variables: ["fact", "explanation", "actionable_tip"],
    cmsrApproved: true,
  },
];
