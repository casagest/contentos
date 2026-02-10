export type KpiFormat = "number" | "currency" | "percent" | "multiplier";

export interface KpiConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  format: KpiFormat;
  defaultValue: number;
}

export interface FunnelStage {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface IndustryConfig {
  label: string;
  icon: string;
  kpis: KpiConfig[];
  funnelStages: FunnelStage[];
  contentTips: string[];
  bestPostTypes: string[];
}

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  dental: {
    label: "Dental",
    icon: "Stethoscope",
    kpis: [
      { key: "leads", label: "Leads Noi", icon: "UserPlus", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "consultations", label: "Consultații Programate", icon: "CalendarCheck", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "treatments", label: "Tratamente Finalizate", icon: "CheckCircle2", color: "#10b981", format: "number", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "costPerLead", label: "Cost/Lead", icon: "TrendingDown", color: "#ef4444", format: "currency", defaultValue: 0 },
      { key: "conversionRate", label: "Rata Conversie", icon: "Target", color: "#06b6d4", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "lead", label: "Lead Nou", icon: "UserPlus", color: "#6366f1", description: "Contacte noi din campanii" },
      { id: "consultation", label: "Consultație", icon: "Stethoscope", color: "#8b5cf6", description: "Programat pentru consultație" },
      { id: "plan", label: "Plan Tratament", icon: "ClipboardList", color: "#a855f7", description: "Plan de tratament acceptat" },
      { id: "treatment", label: "Tratament", icon: "Activity", color: "#10b981", description: "Tratament în desfășurare" },
      { id: "followup", label: "Follow-up", icon: "PhoneCall", color: "#06b6d4", description: "Control și urmărire" },
      { id: "review", label: "Recenzie", icon: "Star", color: "#f59e0b", description: "Recenzie lăsată" },
    ],
    contentTips: [
      "Postează Before/After (cu consimțământ GDPR)",
      "Video explicativ proceduri",
      "Testimoniale pacienți",
    ],
    bestPostTypes: ["Before/After", "Video educativ", "Testimonial", "Tur clinică"],
  },

  restaurant: {
    label: "Restaurant",
    icon: "UtensilsCrossed",
    kpis: [
      { key: "reservations", label: "Rezervări Azi", icon: "CalendarCheck", color: "#f59e0b", format: "number", defaultValue: 0 },
      { key: "onlineOrders", label: "Comenzi Online", icon: "ShoppingBag", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "avgRating", label: "Rating Mediu", icon: "Star", color: "#eab308", format: "multiplier", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#10b981", format: "currency", defaultValue: 0 },
      { key: "costPerClient", label: "Cost/Client", icon: "TrendingDown", color: "#ef4444", format: "currency", defaultValue: 0 },
      { key: "returnRate", label: "Rata Revenire", icon: "RefreshCw", color: "#8b5cf6", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "discovery", label: "Descoperire", icon: "Search", color: "#6366f1", description: "Descoperă restaurantul" },
      { id: "visit_site", label: "Vizită Site/App", icon: "Globe", color: "#8b5cf6", description: "Vizitează site-ul sau aplicația" },
      { id: "reservation", label: "Rezervare/Comandă", icon: "CalendarCheck", color: "#a855f7", description: "Plasează rezervare sau comandă" },
      { id: "visit", label: "Vizită", icon: "MapPin", color: "#10b981", description: "Vizitează restaurantul" },
      { id: "review", label: "Review", icon: "Star", color: "#f59e0b", description: "Lasă o recenzie" },
      { id: "loyal", label: "Client Fidel", icon: "Heart", color: "#ef4444", description: "Revine regulat" },
    ],
    contentTips: [
      "Food photography cu lumină naturală",
      "Reels cu preparare în bucătărie",
      "Promovează meniul zilei",
    ],
    bestPostTypes: ["Food photo", "Reel bucătărie", "Meniu zilei", "Review client"],
  },

  fitness: {
    label: "Fitness",
    icon: "Dumbbell",
    kpis: [
      { key: "activeMembers", label: "Membri Activi", icon: "Users", color: "#10b981", format: "number", defaultValue: 0 },
      { key: "newSignups", label: "Înscrieri Luna", icon: "UserPlus", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "retentionRate", label: "Rata Retenție", icon: "RefreshCw", color: "#8b5cf6", format: "percent", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "costPerMember", label: "Cost/Membru", icon: "TrendingDown", color: "#ef4444", format: "currency", defaultValue: 0 },
      { key: "nps", label: "NPS Score", icon: "ThumbsUp", color: "#06b6d4", format: "number", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "interest", label: "Interes", icon: "Eye", color: "#6366f1", description: "Arată interes pentru fitness" },
      { id: "trial", label: "Trial Gratuit", icon: "Gift", color: "#8b5cf6", description: "Încearcă gratuit" },
      { id: "signup", label: "Înscriere", icon: "UserPlus", color: "#a855f7", description: "Se înscrie ca membru" },
      { id: "active", label: "Membru Activ", icon: "Activity", color: "#10b981", description: "Participă regulat" },
      { id: "referral", label: "Referral", icon: "Share2", color: "#f59e0b", description: "Recomandă prieteni" },
    ],
    contentTips: [
      "Transformări Before/After",
      "Workout-uri scurte pe TikTok",
      "Testimoniale membri",
    ],
    bestPostTypes: ["Transformare", "Workout clip", "Testimonial", "Tips nutriție"],
  },

  beauty: {
    label: "Beauty",
    icon: "Sparkles",
    kpis: [
      { key: "appointmentsToday", label: "Programări Azi", icon: "CalendarCheck", color: "#ec4899", format: "number", defaultValue: 0 },
      { key: "newClients", label: "Clienți Noi", icon: "UserPlus", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "rating", label: "Rating", icon: "Star", color: "#eab308", format: "multiplier", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#10b981", format: "currency", defaultValue: 0 },
      { key: "avgTicket", label: "Ticket Mediu", icon: "Receipt", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "returnRate", label: "Rata Revenire", icon: "RefreshCw", color: "#06b6d4", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "discovery", label: "Descoperire", icon: "Search", color: "#ec4899", description: "Descoperă salonul" },
      { id: "appointment", label: "Programare", icon: "CalendarCheck", color: "#8b5cf6", description: "Programează o vizită" },
      { id: "service", label: "Serviciu", icon: "Sparkles", color: "#a855f7", description: "Primește serviciul" },
      { id: "review", label: "Review", icon: "Star", color: "#f59e0b", description: "Lasă o recenzie" },
      { id: "loyal", label: "Client Fidel", icon: "Heart", color: "#ef4444", description: "Revine regulat" },
      { id: "referral", label: "Referral", icon: "Share2", color: "#10b981", description: "Recomandă prieteni" },
    ],
    contentTips: [
      "Video time-lapse tratamente",
      "Before/After close-up",
      "Tips îngrijire acasă",
    ],
    bestPostTypes: ["Time-lapse", "Before/After", "Tips", "Testimonial"],
  },

  ecommerce: {
    label: "E-commerce",
    icon: "ShoppingCart",
    kpis: [
      { key: "ordersToday", label: "Comenzi Azi", icon: "ShoppingBag", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "visitors", label: "Vizitatori", icon: "Users", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "convRate", label: "Conv. Rate", icon: "Target", color: "#10b981", format: "percent", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "aov", label: "AOV", icon: "Receipt", color: "#ec4899", format: "currency", defaultValue: 0 },
      { key: "roas", label: "ROAS", icon: "TrendingUp", color: "#06b6d4", format: "multiplier", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "traffic", label: "Traffic", icon: "Globe", color: "#6366f1", description: "Vizitatori pe site" },
      { id: "browse", label: "Vizitare", icon: "Eye", color: "#8b5cf6", description: "Navighează produse" },
      { id: "cart", label: "Coș", icon: "ShoppingCart", color: "#a855f7", description: "Adaugă în coș" },
      { id: "checkout", label: "Checkout", icon: "CreditCard", color: "#10b981", description: "Finalizează comanda" },
      { id: "delivery", label: "Livrare", icon: "Truck", color: "#f59e0b", description: "Comandă livrată" },
      { id: "review", label: "Review", icon: "Star", color: "#eab308", description: "Lasă o recenzie" },
    ],
    contentTips: [
      "Unboxing videos",
      "User generated content",
      "Flash sale countdown",
    ],
    bestPostTypes: ["Unboxing", "UGC", "Flash sale", "Product showcase"],
  },

  agency: {
    label: "Agenție",
    icon: "Building2",
    kpis: [
      { key: "activeClients", label: "Clienți Activi", icon: "Users", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "projects", label: "Proiecte", icon: "FolderOpen", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "proposalsSent", label: "Propuneri Trimise", icon: "Send", color: "#a855f7", format: "number", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "mrr", label: "MRR", icon: "TrendingUp", color: "#10b981", format: "currency", defaultValue: 0 },
      { key: "churnRate", label: "Churn Rate", icon: "TrendingDown", color: "#ef4444", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "prospect", label: "Prospect", icon: "UserPlus", color: "#6366f1", description: "Lead identificat" },
      { id: "discovery", label: "Discovery Call", icon: "PhoneCall", color: "#8b5cf6", description: "Apel de descoperire" },
      { id: "proposal", label: "Propunere", icon: "FileText", color: "#a855f7", description: "Propunere trimisă" },
      { id: "negotiation", label: "Negociere", icon: "MessageSquare", color: "#ec4899", description: "Negociere în curs" },
      { id: "contract", label: "Contract", icon: "FileCheck", color: "#10b981", description: "Contract semnat" },
      { id: "delivery", label: "Delivery", icon: "Rocket", color: "#f59e0b", description: "Livrare proiect" },
      { id: "upsell", label: "Upsell", icon: "TrendingUp", color: "#06b6d4", description: "Oportunitate de extindere" },
    ],
    contentTips: [
      "Case studies cu rezultate",
      "Behind the scenes",
      "Tips & tricks educative",
    ],
    bestPostTypes: ["Case study", "Behind the scenes", "Tips", "Client result"],
  },

  turism: {
    label: "Turism",
    icon: "Plane",
    kpis: [
      { key: "bookings", label: "Rezervări", icon: "CalendarCheck", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "inquiries", label: "Cereri Ofertă", icon: "MessageSquare", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "rating", label: "Rating", icon: "Star", color: "#eab308", format: "multiplier", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "avgTicket", label: "Ticket Mediu", icon: "Receipt", color: "#ec4899", format: "currency", defaultValue: 0 },
      { key: "occupancy", label: "Ocupare %", icon: "BarChart3", color: "#10b981", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "inspire", label: "Inspirare", icon: "Sparkles", color: "#6366f1", description: "Se inspiră pentru vacanță" },
      { id: "inquiry", label: "Cerere", icon: "MessageSquare", color: "#8b5cf6", description: "Solicită informații" },
      { id: "offer", label: "Ofertă", icon: "FileText", color: "#a855f7", description: "Primește oferta" },
      { id: "booking", label: "Rezervare", icon: "CalendarCheck", color: "#10b981", description: "Confirmă rezervarea" },
      { id: "experience", label: "Experiență", icon: "Camera", color: "#f59e0b", description: "Trăiește experiența" },
      { id: "review", label: "Review", icon: "Star", color: "#eab308", description: "Lasă o recenzie" },
      { id: "return", label: "Revenire", icon: "RefreshCw", color: "#06b6d4", description: "Revine pentru altă experiență" },
    ],
    contentTips: [
      "Drone footage locații",
      "Guest stories",
      "Seasonal promotions",
    ],
    bestPostTypes: ["Drone footage", "Guest story", "Promo sezonier", "Virtual tour"],
  },

  // Default/generic for any industry not explicitly configured
  altele: {
    label: "General",
    icon: "Briefcase",
    kpis: [
      { key: "leads", label: "Leads", icon: "UserPlus", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "conversions", label: "Conversii", icon: "Target", color: "#10b981", format: "number", defaultValue: 0 },
      { key: "rating", label: "Rating", icon: "Star", color: "#eab308", format: "multiplier", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "costPerConversion", label: "Cost/Conversie", icon: "TrendingDown", color: "#ef4444", format: "currency", defaultValue: 0 },
      { key: "roi", label: "ROI", icon: "TrendingUp", color: "#06b6d4", format: "multiplier", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "awareness", label: "Awareness", icon: "Eye", color: "#6366f1", description: "Conștientizare brand" },
      { id: "interest", label: "Interest", icon: "Heart", color: "#8b5cf6", description: "Interes manifestat" },
      { id: "consideration", label: "Consideration", icon: "Scale", color: "#a855f7", description: "Evaluare opțiuni" },
      { id: "purchase", label: "Purchase", icon: "ShoppingBag", color: "#10b981", description: "Achiziție realizată" },
      { id: "loyalty", label: "Loyalty", icon: "Crown", color: "#f59e0b", description: "Client fidel" },
    ],
    contentTips: [
      "Conținut educativ",
      "Behind the scenes",
      "Testimoniale clienți",
    ],
    bestPostTypes: ["Educativ", "Behind the scenes", "Testimonial", "Tips"],
  },

  // Map industries that don't have specific configs to the closest match
  medical: {
    label: "Medical",
    icon: "Stethoscope",
    kpis: [
      { key: "leads", label: "Leads Noi", icon: "UserPlus", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "appointments", label: "Programări", icon: "CalendarCheck", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "treatments", label: "Tratamente", icon: "CheckCircle2", color: "#10b981", format: "number", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "costPerLead", label: "Cost/Lead", icon: "TrendingDown", color: "#ef4444", format: "currency", defaultValue: 0 },
      { key: "conversionRate", label: "Rata Conversie", icon: "Target", color: "#06b6d4", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "lead", label: "Lead Nou", icon: "UserPlus", color: "#6366f1", description: "Contact nou" },
      { id: "appointment", label: "Programare", icon: "CalendarCheck", color: "#8b5cf6", description: "Programat pentru consultație" },
      { id: "consultation", label: "Consultație", icon: "Stethoscope", color: "#a855f7", description: "Consultație realizată" },
      { id: "treatment", label: "Tratament", icon: "Activity", color: "#10b981", description: "Tratament în curs" },
      { id: "followup", label: "Follow-up", icon: "PhoneCall", color: "#06b6d4", description: "Control și urmărire" },
      { id: "review", label: "Recenzie", icon: "Star", color: "#f59e0b", description: "Recenzie lăsată" },
    ],
    contentTips: [
      "Conținut educativ despre sănătate",
      "Testimoniale pacienți (cu consimțământ)",
      "Tips de prevenție",
    ],
    bestPostTypes: ["Educativ", "Testimonial", "Tips sănătate", "Echipa medicală"],
  },

  fashion: {
    label: "Fashion",
    icon: "Shirt",
    kpis: [
      { key: "ordersToday", label: "Comenzi Azi", icon: "ShoppingBag", color: "#ec4899", format: "number", defaultValue: 0 },
      { key: "visitors", label: "Vizitatori", icon: "Users", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "convRate", label: "Conv. Rate", icon: "Target", color: "#10b981", format: "percent", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "aov", label: "AOV", icon: "Receipt", color: "#6366f1", format: "currency", defaultValue: 0 },
      { key: "returnRate", label: "Rata Return", icon: "RefreshCw", color: "#ef4444", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "discovery", label: "Descoperire", icon: "Search", color: "#ec4899", description: "Descoperă brandul" },
      { id: "browse", label: "Navigare", icon: "Eye", color: "#8b5cf6", description: "Explorează colecția" },
      { id: "cart", label: "Coș", icon: "ShoppingCart", color: "#a855f7", description: "Adaugă în coș" },
      { id: "purchase", label: "Cumpărare", icon: "CreditCard", color: "#10b981", description: "Finalizează comanda" },
      { id: "review", label: "Review", icon: "Star", color: "#f59e0b", description: "Partajează experiența" },
      { id: "ambassador", label: "Ambassador", icon: "Crown", color: "#6366f1", description: "Ambasador de brand" },
    ],
    contentTips: [
      "Outfit of the day (OOTD)",
      "Behind the scenes colecție",
      "Styling tips și lookbook",
    ],
    bestPostTypes: ["OOTD", "Lookbook", "BTS colecție", "Styling tips"],
  },

  real_estate: {
    label: "Imobiliare",
    icon: "Home",
    kpis: [
      { key: "listings", label: "Proprietăți Active", icon: "Home", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "inquiries", label: "Cereri Vizionare", icon: "Eye", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "viewings", label: "Vizionări", icon: "MapPin", color: "#a855f7", format: "number", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "avgPrice", label: "Preț Mediu", icon: "TrendingUp", color: "#10b981", format: "currency", defaultValue: 0 },
      { key: "conversionRate", label: "Rata Conversie", icon: "Target", color: "#06b6d4", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "search", label: "Căutare", icon: "Search", color: "#6366f1", description: "Caută proprietăți" },
      { id: "inquiry", label: "Cerere Info", icon: "MessageSquare", color: "#8b5cf6", description: "Solicită informații" },
      { id: "viewing", label: "Vizionare", icon: "Eye", color: "#a855f7", description: "Vizitează proprietatea" },
      { id: "offer", label: "Ofertă", icon: "FileText", color: "#10b981", description: "Depune ofertă" },
      { id: "contract", label: "Contract", icon: "FileCheck", color: "#f59e0b", description: "Semnează contractul" },
      { id: "referral", label: "Referral", icon: "Share2", color: "#06b6d4", description: "Recomandă serviciul" },
    ],
    contentTips: [
      "Virtual tour proprietăți",
      "Analiza pieței imobiliare locale",
      "Tips pentru cumpărători/chiriași",
    ],
    bestPostTypes: ["Virtual tour", "Property showcase", "Market analysis", "Tips"],
  },

  education: {
    label: "Educație",
    icon: "GraduationCap",
    kpis: [
      { key: "students", label: "Studenți Activi", icon: "Users", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "enrollments", label: "Înscrieri", icon: "UserPlus", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "completionRate", label: "Rata Completare", icon: "CheckCircle2", color: "#10b981", format: "percent", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "avgRating", label: "Rating Cursuri", icon: "Star", color: "#eab308", format: "multiplier", defaultValue: 0 },
      { key: "nps", label: "NPS Score", icon: "ThumbsUp", color: "#06b6d4", format: "number", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "awareness", label: "Descoperire", icon: "Search", color: "#6366f1", description: "Descoperă platforma" },
      { id: "interest", label: "Interes", icon: "Heart", color: "#8b5cf6", description: "Explorează cursurile" },
      { id: "trial", label: "Trial/Demo", icon: "Gift", color: "#a855f7", description: "Încearcă gratuit" },
      { id: "enrollment", label: "Înscriere", icon: "UserPlus", color: "#10b981", description: "Se înscrie la curs" },
      { id: "completion", label: "Absolvire", icon: "GraduationCap", color: "#f59e0b", description: "Finalizează cursul" },
      { id: "referral", label: "Referral", icon: "Share2", color: "#06b6d4", description: "Recomandă platforma" },
    ],
    contentTips: [
      "Mini-lecții gratuite pe social media",
      "Success stories absolvenți",
      "Tips și resurse gratuite",
    ],
    bestPostTypes: ["Mini-lecție", "Success story", "Tips gratuite", "Behind the scenes"],
  },

  tech: {
    label: "Tech",
    icon: "Monitor",
    kpis: [
      { key: "users", label: "Utilizatori Activi", icon: "Users", color: "#6366f1", format: "number", defaultValue: 0 },
      { key: "signups", label: "Signup-uri", icon: "UserPlus", color: "#8b5cf6", format: "number", defaultValue: 0 },
      { key: "trialToPayRate", label: "Trial→Pay", icon: "Target", color: "#10b981", format: "percent", defaultValue: 0 },
      { key: "revenue", label: "Revenue MTD (€)", icon: "Euro", color: "#f59e0b", format: "currency", defaultValue: 0 },
      { key: "mrr", label: "MRR", icon: "TrendingUp", color: "#ec4899", format: "currency", defaultValue: 0 },
      { key: "churnRate", label: "Churn Rate", icon: "TrendingDown", color: "#ef4444", format: "percent", defaultValue: 0 },
    ],
    funnelStages: [
      { id: "awareness", label: "Awareness", icon: "Eye", color: "#6366f1", description: "Descoperă produsul" },
      { id: "signup", label: "Signup", icon: "UserPlus", color: "#8b5cf6", description: "Creează cont" },
      { id: "activation", label: "Activare", icon: "Zap", color: "#a855f7", description: "Prima acțiune de valoare" },
      { id: "retention", label: "Retenție", icon: "RefreshCw", color: "#10b981", description: "Utilizare recurentă" },
      { id: "revenue", label: "Revenue", icon: "CreditCard", color: "#f59e0b", description: "Plătește pentru produs" },
      { id: "referral", label: "Referral", icon: "Share2", color: "#06b6d4", description: "Recomandă produsul" },
    ],
    contentTips: [
      "Product updates și feature demos",
      "Tutorial-uri și how-to guides",
      "Customer success stories",
    ],
    bestPostTypes: ["Product demo", "Tutorial", "Customer story", "Behind the code"],
  },
};

export function getIndustryConfig(industry: string): IndustryConfig {
  return INDUSTRY_CONFIGS[industry] || INDUSTRY_CONFIGS.altele;
}
