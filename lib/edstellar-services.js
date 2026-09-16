/**
 * The Edstellar services catalogue — four groups, eleven sub-groups, and the
 * 42 services an org admin can request.
 *
 * Catalogue as code, like `lib/course-taxonomy.js` and `lib/lesson-content.js`
 * before it. The server holds its own list of valid service names
 * (`common/edstellar-services.ts`) and refuses a request naming anything else,
 * so the two must be edited together — drift shows up as a 422 naming the
 * valid set rather than a request silently filed against a service nobody
 * offers.
 *
 * The per-service QUESTION SETS live here and NOT on the server. They decide
 * which questions to render; the answers are stored as one JSON blob. A
 * question set is presentation, and putting 30KB of it behind an API the
 * browser would immediately re-render adds a round trip and a second thing to
 * keep in step.
 *
 * `icon` is a lucide component NAME, resolved by the page. No inline SVG, no
 * emoji — every glyph in this app comes from lucide.
 *
 * `tone` maps to a Spectra token rather than a hex value. The reference's four
 * group colours already ARE the chart ramp (TASTE §10.4: accent-blue, success,
 * warning, rust), so this introduces no new hue.
 */

export const SERVICE_GROUPS = [
  {
    key: "consulting",
    group: "Consulting",
    tone: "accent",
    icon: "Search",
    groupDesc: "Diagnostic, advisory and design services for L&D and OD capability",
    subGroups: [
      {
        sub: "L&D Consulting",
        icon: "BookOpen",
        subDesc: "Strategy, architecture and framework design for enterprise learning",
        items: [
          { name: "Training Needs Analysis (TNA)",
            desc: "Diagnose capability gaps at individual, team or organisation level using structured interviews, surveys, performance data and role analysis. Outputs a prioritised training plan with ROI rationale and programme recommendations.",
            badge: "Popular",
            formKey: "tna" },
          { name: "Learning Strategy & Design",
            desc: "Build a multi-year learning architecture aligned to business priorities — including delivery modes, governance, technology stack, budget allocation and success metrics tailored to your organisation's maturity and scale.",
            formKey: "learning_strategy" },
          { name: "Competency Framework Design",
            desc: "Create a role-by-role competency taxonomy mapping skills, behaviours and proficiency levels. Used as a foundation for hiring, performance management, learning assignment and career pathing across the organisation.",
            formKey: "comp_framework" },
          { name: "Content Development",
            desc: "Design and produce bespoke learning content in any format — e-learning modules, facilitator guides, video-based learning, workbooks and digital job aids — built to your brand, tone and learner context.",
            formKey: "content_dev" },
          { name: "Learning Technology Advisory",
            desc: "Get independent guidance on LMS and LXP selection, RFP design, vendor evaluation, implementation planning and post-launch optimisation — ensuring your technology investment delivers real learning impact.",
            formKey: "lms_advisory" },
        ],
      },
      {
        sub: "OD Consulting",
        icon: "Building2",
        subDesc: "Organisation-wide interventions for culture, structure and change",
        items: [
          { name: "Organisational Development (OD)",
            desc: "Address systemic gaps in how the organisation operates — covering culture, structure, collaboration patterns, role clarity and decision-making processes that training alone cannot fix.",
            formKey: "od_general" },
          { name: "Culture Transformation",
            desc: "Diagnose current culture using surveys, focus groups and leadership interviews, then co-design a targeted shift programme with behaviours, rituals, leadership role-modelling and measurement frameworks.",
            formKey: "culture" },
          { name: "Change Management",
            desc: "Manage the human side of major transitions — restructures, mergers, digital transformation or leadership change — using stakeholder engagement plans, communication design and capability building for change champions.",
            formKey: "change_mgmt" },
          { name: "Team Effectiveness",
            desc: "Assess team health using validated diagnostics, then design targeted interventions — team charters, conflict resolution workshops, operating model redesign — to build trust, accountability and high performance.",
            formKey: "team_eff" },
          { name: "Succession Planning",
            desc: "Identify high-potential talent, assess leadership readiness, and build individualised development plans with structured milestones — creating a healthy internal pipeline for critical roles before vacancies arise.",
            formKey: "succession" },
        ],
      },
      {
        sub: "Assessment",
        icon: "BarChart3",
        subDesc: "Scientifically validated tools to understand people, teams and organisations",
        items: [
          { name: "Psychometric Assessment",
            desc: "Deploy scientifically validated personality, aptitude and cognitive assessments to support hiring decisions, development planning and succession. Includes individual reports, debriefs and manager briefings.",
            badge: "Popular",
            formKey: "psychometric" },
          { name: "Leadership Assessment",
            desc: "Measure leadership effectiveness using 360° multi-rater feedback, Hogan or custom frameworks. Provides a structured view of strengths, blind spots and development priorities for leaders at every level.",
            formKey: "leadership_assessment" },
          { name: "MBTI",
            desc: "Administer the Myers-Briggs Type Indicator to build individual self-awareness and team communication. Delivered by certified facilitators with group workshops, individual debriefs and practical application tools.",
            formKey: "mbti" },
          { name: "DISC Assessment",
            desc: "Profile behavioural styles across Dominance, Influence, Steadiness and Conscientiousness to improve team dynamics, communication effectiveness and manager-employee relationships.",
            badge: "Popular",
            formKey: "disc" },
          { name: "360° Feedback",
            desc: "Gather structured, confidential feedback from managers, peers, direct reports and stakeholders. Edstellar designs the framework, manages the process and facilitates meaningful debrief conversations to drive action.",
            formKey: "feedback_360" },
          { name: "Competency Assessment",
            desc: "Evaluate employee capabilities against role-specific competencies for promotion, selection or development decisions. Results are mapped to learning interventions for immediate follow-up action.",
            formKey: "competency_assess" },
          { name: "Assessment Centre",
            desc: "Run multi-method evaluation events combining simulations, group exercises, interviews and psychometrics to assess leadership potential, promotability or technical readiness at scale.",
            formKey: "assessment_centre" },
        ],
      },
    ],
  },
  {
    key: "corporate-training",
    group: "Corporate Training",
    tone: "success",
    icon: "Target",
    groupDesc: "Facilitator-led and virtual training programmes across all domains and levels",
    subGroups: [
      {
        sub: "Technical & Domain",
        icon: "Settings2",
        subDesc: "Role-specific and industry-aligned technical and functional training",
        items: [
          { name: "Digital & Technology Skills",
            desc: "Build digital fluency across the workforce — covering data literacy, AI productivity tools, advanced Excel, Power BI, Microsoft 365 and automation basics relevant to each role and function.",
            formKey: "technical" },
          { name: "Finance for Non-Finance",
            desc: "Help non-finance managers read P&L statements, understand budgeting cycles, control costs and make data-driven decisions — building financial acumen that drives better business outcomes.",
            formKey: "technical" },
          { name: "Sales & Business Development",
            desc: "Develop consultative selling skills, structured pipeline management, negotiation techniques and BD strategies — tailored to your product, sales cycle and customer profile for measurable revenue impact.",
            formKey: "technical" },
          { name: "Project Management",
            desc: "Train teams in PM fundamentals, Agile, Scrum and hybrid frameworks — covering planning, stakeholder management, risk mitigation and delivery discipline for on-time, on-budget project execution.",
            formKey: "technical" },
        ],
      },
      {
        sub: "Compliance & Safety",
        icon: "ShieldCheck",
        subDesc: "Statutory, regulatory and mandatory training programmes",
        items: [
          { name: "POSH / Prevention of Harassment",
            desc: "Deliver POSH Act-compliant training for all employees and Internal Committee (IC) members — covering law overview, case studies, complaint procedures and the organisation's responsibility to maintain a safe workplace.",
            badge: "Popular",
            formKey: "compliance" },
          { name: "Safety & HSE Training",
            desc: "Build a safety-first culture with programmes covering process safety, hazard identification, emergency response, incident investigation and HSE compliance tailored to your industry and site operations.",
            formKey: "compliance" },
          { name: "Data Privacy (GDPR / DPDP)",
            desc: "Educate employees on India's DPDP Act and global GDPR requirements — covering data handling principles, consent, breach reporting and employee obligations to protect customer and employee data.",
            formKey: "compliance" },
          { name: "Ethics & Code of Conduct",
            desc: "Reinforce ethical decision-making, anti-bribery principles, conflict of interest management and speak-up culture — helping employees navigate grey areas with confidence and in alignment with company values.",
            formKey: "compliance" },
        ],
      },
      {
        sub: "Leadership & Management",
        icon: "Crown",
        subDesc: "From first-time managers to senior leaders — ILT, VILT and blended",
        items: [
          { name: "First-Time Manager Programme",
            desc: "Equip newly promoted managers with the mindset and skills to lead effectively — covering delegation, feedback, one-on-ones, performance conversations and building team trust from day one.",
            badge: "Popular",
            formKey: "leadership_training" },
          { name: "Leadership Development",
            desc: "Accelerate mid to senior leaders through immersive programmes covering strategic thinking, executive communication, stakeholder influence, leading change and building organisational culture.",
            formKey: "leadership_training" },
          { name: "Coaching Skills for Managers",
            desc: "Build a coaching culture by training managers in the GROW model, active listening, powerful questioning and structured feedback — enabling them to unlock team potential through everyday conversations.",
            formKey: "soft_skills" },
          { name: "Hi-Po / Succession Development",
            desc: "Design tailored acceleration programmes for high-potential employees combining stretch assignments, mentoring, leadership assessments and cohort-based learning to fast-track readiness for senior roles.",
            formKey: "leadership_training" },
        ],
      },
      {
        sub: "Soft Skills",
        icon: "Handshake",
        subDesc: "Communication, collaboration and interpersonal effectiveness",
        items: [
          { name: "Communication & Presentation",
            desc: "Build confident communicators at every level — covering structured business writing, data storytelling, executive-ready presentations and managing difficult conversations with clarity and impact.",
            badge: "Popular",
            formKey: "soft_skills" },
          { name: "Customer Service Excellence",
            desc: "Develop a customer-first mindset across service teams — training empathy, active listening, complaint resolution, managing difficult customers and consistently delivering service that builds loyalty.",
            formKey: "soft_skills" },
          { name: "Negotiation & Influencing",
            desc: "Equip professionals to negotiate with confidence — covering interest-based negotiation, reading counterpart styles, anchoring, concession management and closing deals without damaging relationships.",
            formKey: "soft_skills" },
          { name: "Emotional Intelligence (EQ)",
            desc: "Strengthen self-awareness, emotional regulation, empathy and social skills — helping employees manage workplace stress, navigate conflict, build better relationships and perform under pressure.",
            formKey: "soft_skills" },
        ],
      },
    ],
  },
  {
    key: "platforms",
    group: "Platforms",
    tone: "warning",
    icon: "Zap",
    groupDesc: "Technology-enabled platforms and engines for workforce intelligence and assessment",
    subGroups: [
      {
        sub: "Workforce Intelligence",
        icon: "TrendingUp",
        subDesc: "Data-driven platforms for skills taxonomy, dashboards and analytics",
        items: [
          { name: "Skills Intelligence Platform (SIP)",
            desc: "Map your entire workforce against a custom skills taxonomy, track capability levels in real time and generate dashboards that give HR, L&D and business leaders a data-driven view of current and future skill gaps.",
            badge: "New",
            formKey: "sip" },
          { name: "TNA / TNI Engine",
            desc: "Automate your training needs identification cycle with a structured digital engine that collects multi-source data, prioritises learning interventions by business impact and generates a dynamic training roadmap.",
            formKey: "tna_engine" },
        ],
      },
      {
        sub: "Assessment & LMS",
        icon: "Monitor",
        subDesc: "Assessment delivery, LMS tooling and system integration services",
        items: [
          { name: "Assessment & LMS Tooling",
            desc: "Configure, integrate and optimise your assessment and learning management systems — covering question banks, proctoring, automated scoring, completion tracking and HRIS/payroll integration for seamless operations.",
            formKey: "lms" },
          { name: "Custom LMS Implementation",
            desc: "End-to-end LMS setup and deployment — including content migration, user provisioning, branding, learning path configuration, manager dashboards and go-live support to get your platform live and adopted fast.",
            formKey: "lms" },
        ],
      },
    ],
  },
  {
    key: "solutions",
    group: "Solutions",
    tone: "rust",
    icon: "Sparkles",
    groupDesc: "End-to-end managed programmes and flagship Edstellar branded products",
    subGroups: [
      {
        sub: "Managed Programmes",
        icon: "Layers",
        subDesc: "Fully managed transformation and development engagements",
        items: [
          { name: "Capability Transformation",
            desc: "A fully managed end-to-end engagement: Edstellar diagnoses gaps, designs the intervention, delivers training, coaches managers and measures business impact — acting as your embedded L&D partner throughout the journey.",
            formKey: "capability" },
          { name: "Blended / On-the-Job Learning",
            desc: "Combine classroom or virtual training with structured workplace application — pairing formal learning with coaching, peer learning circles, manager check-ins and on-the-job assignments to embed real behaviour change.",
            formKey: "soft_skills" },
        ],
      },
      {
        sub: "Flagship Products",
        icon: "Trophy",
        subDesc: "Edstellar's signature offerings and brand extensions",
        items: [
          { name: "Imperium — Executive Retreats",
            desc: "Curated leadership experiences for C-suite and senior teams — combining strategic facilitation, peer dialogue, reflective practice and executive coaching in premium offsite settings to accelerate alignment and leadership effectiveness.",
            badge: "Premium",
            formKey: "imperium" },
          { name: "Polaris — Team Alignment",
            desc: "A structured card-deck based facilitation methodology designed to surface team values, operating norms, conflict patterns and collaboration gaps — building psychological safety and shared accountability in a single powerful session.",
            formKey: "polaris" },
          { name: "Invensis Learning — Certifications",
            desc: "Accredited international certification programmes delivered by certified instructors — covering PMP, PRINCE2, ITIL, Six Sigma, Agile, Scrum, Lean and more to build globally recognised credentials across your workforce.",
            formKey: "certification" },
        ],
      },
    ],
  },
];

/** Every service name, flat — used to look one up and to sanity-check the API's list. */
export const SERVICE_NAMES = SERVICE_GROUPS.flatMap((g) =>
  g.subGroups.flatMap((s) => s.items.map((i) => i.name)),
);

/** Find a service by name, with the group it belongs to. */
export function findService(name) {
  for (const group of SERVICE_GROUPS) {
    for (const sub of group.subGroups) {
      const item = sub.items.find((i) => i.name === name);
      if (item) return { ...item, group, sub };
    }
  }
  return null;
}

/** Badge -> chip class. Three labels, three of the five status chips (§10.3). */
export const BADGE_CHIP = {
  Popular: "chip-complete",
  New: "chip-progress",
  Premium: "chip-warning",
};

/**
 * Question sets, keyed by a service's `formKey`. A service whose key has no
 * entry falls back to `default` — that is deliberate, not an oversight: 13 of
 * the services carry a bespoke set and the rest are served well by the generic
 * one, and inventing 42 bespoke forms would be 42 forms to maintain.
 */
export const SERVICE_FORMS = {
  "psychometric": {
    "headline": "Psychometric Assessment Request",
    "intro": "Help us understand your assessment requirement so we can recommend the right tools and approach.",
    "sections": [
      {
        "heading": "Purpose & Scope",
        "fields": [
          {
            "id": "purpose",
            "label": "Primary purpose of the assessment (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Employee selection / hiring",
              "Employee development",
              "Team building",
              "Succession planning",
              "Career transition counselling",
              "Other"
            ],
            "condTrigger": "Other",
            "condField": {
              "id": "purpose_other",
              "label": "Please describe the other purpose",
              "type": "textarea",
              "rows": 2,
              "placeholder": "Describe your specific requirement..."
            }
          },
          {
            "id": "tool_pref",
            "label": "Do you have a preferred assessment tool?",
            "type": "radio",
            "opts": [
              "Yes — specific tool (please specify below)",
              "Open to Edstellar recommendation",
              "Would like a comparison of tools first"
            ],
            "condTrigger": "Yes — specific tool (please specify below)",
            "condField": {
              "id": "tool_name",
              "label": "Which tool(s) are you considering?",
              "type": "text",
              "placeholder": "e.g. Hogan HPI, SHL OPQ32, Mettl, Thomas International, MSAI..."
            }
          },
          {
            "id": "prev_use",
            "label": "Have you used psychometric assessments before?",
            "type": "radio",
            "opts": [
              "Yes — with a positive experience",
              "Yes — but not satisfied with the previous approach",
              "No — this is our first time",
              "Not sure"
            ],
            "condTrigger": "Yes — but not satisfied with the previous approach",
            "condField": {
              "id": "prev_issue",
              "label": "What did not work well previously?",
              "type": "textarea",
              "rows": 2,
              "placeholder": "e.g. reports were too complex, vendor support was poor, tool did not suit our context..."
            }
          },
          {
            "id": "dept_scope",
            "label": "Department / function in scope",
            "type": "text",
            "placeholder": "e.g. Sales team, Engineering, Finance, all customer-facing roles..."
          },
          {
            "id": "participant_level",
            "label": "Participant level (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Individual contributors",
              "Team leads / supervisors",
              "Middle management",
              "Senior leadership",
              "C-suite / Board"
            ]
          },
          {
            "id": "headcount",
            "label": "Number of participants",
            "type": "select",
            "opts": [
              "1–10",
              "11–25",
              "26–50",
              "51–100",
              "100–250",
              "250+"
            ]
          }
        ]
      },
      {
        "heading": "Output & Delivery",
        "fields": [
          {
            "id": "output",
            "label": "Expected output (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Individual reports",
              "Aggregate / group report",
              "One-on-one debrief sessions",
              "Team debrief workshop",
              "Action plans",
              "Manager briefing kit"
            ]
          },
          {
            "id": "results_use",
            "label": "How will the results be used? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Shared with participants for self-development",
              "Used by HR / managers only",
              "Inform hiring or promotion decisions",
              "Input to a coaching programme",
              "Board / leadership reporting",
              "Not yet decided"
            ]
          },
          {
            "id": "admin_mode",
            "label": "Preferred administration mode",
            "type": "radio",
            "opts": [
              "Online — unproctored (candidate completes independently)",
              "Online — proctored (supervised via webcam)",
              "In-person / paper-based",
              "Flexible — open to recommendation"
            ]
          },
          {
            "id": "norm_group",
            "label": "Norm group / standardisation preference",
            "type": "select",
            "opts": [
              "India norms (default)",
              "Global / international norms",
              "UK / European norms",
              "Industry-specific norms (please mention in Context below)",
              "Not sure — open to recommendation"
            ]
          },
          {
            "id": "language",
            "label": "Language of delivery",
            "type": "select",
            "opts": [
              "English",
              "Hindi",
              "Tamil",
              "Telugu",
              "Marathi",
              "Multiple / to be discussed"
            ]
          },
          {
            "id": "budget",
            "label": "Indicative budget per participant",
            "type": "select",
            "opts": [
              "To be discussed",
              "Under ₹1,000",
              "₹1,000 – ₹3,000",
              "₹3,000 – ₹8,000",
              "₹8,000 – ₹15,000",
              "₹15,000+"
            ]
          },
          {
            "id": "timeline",
            "label": "When do you need this completed?",
            "type": "select",
            "opts": [
              "Within 2 weeks",
              "This month",
              "Next quarter",
              "Within 6 months",
              "Flexible"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Briefly describe what's prompting this request",
            "type": "textarea",
            "rows": 3,
            "placeholder": "e.g. We are expanding our sales team and want to assess cultural fit alongside skills, targeting 40 hires in Q3..."
          },
          {
            "id": "additional",
            "label": "Any specific requirements or constraints?",
            "type": "textarea",
            "rows": 2,
            "placeholder": "e.g. Must be EEO compliant, need bilingual reports, we have an existing vendor relationship..."
          },
          {
            "id": "attach_note",
            "type": "note",
            "text": "If you have existing job descriptions, competency frameworks or prior assessment reports, email them to connect@edstellar.com quoting your reference number after submission — this helps us recommend the right tool faster."
          }
        ]
      }
    ]
  },
  "leadership_assessment": {
    "headline": "Leadership Assessment Request",
    "intro": "Tell us about the leadership assessment you need and we will design the right approach.",
    "sections": [
      {
        "heading": "Assessment Scope",
        "fields": [
          {
            "id": "assess_type",
            "label": "Type of assessment needed (select all that apply)",
            "type": "checkbox",
            "opts": [
              "360° Feedback",
              "Hogan Assessments",
              "Leadership Potential Assessment",
              "Executive Assessment / Deep Dive",
              "Development Centre",
              "Situational Judgement Test (SJT)",
              "Not sure — need guidance"
            ]
          },
          {
            "id": "target_level",
            "label": "Leadership level being assessed",
            "type": "checkbox",
            "opts": [
              "First-time managers",
              "Mid-level leaders (AM–VP)",
              "Senior leaders / Business unit heads",
              "C-suite / Executive team"
            ]
          },
          {
            "id": "headcount",
            "label": "Number of leaders to be assessed",
            "type": "select",
            "opts": [
              "1–5",
              "6–15",
              "16–30",
              "31–50",
              "50+"
            ]
          },
          {
            "id": "purpose",
            "label": "Primary purpose",
            "type": "radio",
            "opts": [
              "Leadership development planning",
              "Succession planning & pipeline",
              "Performance calibration",
              "Team effectiveness",
              "Executive coaching support",
              "Hire / promotion decision"
            ]
          }
        ]
      },
      {
        "heading": "Coaching & Follow-up",
        "fields": [
          {
            "id": "coaching",
            "label": "Will coaching / debriefs be required alongside the assessment?",
            "type": "radio",
            "opts": [
              "Yes — individual coaching",
              "Yes — group debrief workshop",
              "Both",
              "Not required",
              "Open to recommendation"
            ]
          },
          {
            "id": "stakeholders",
            "label": "Who are the key stakeholders for this programme?",
            "type": "checkbox",
            "opts": [
              "CHRO / HR Director",
              "CEO / MD",
              "Line managers",
              "The leaders being assessed",
              "External board / investors"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "What is the organisational context driving this request?",
            "type": "textarea",
            "placeholder": "e.g. We have 18 mid-level managers, 6 of whom are being considered for director roles. We need an objective view of their leadership readiness..."
          },
          {
            "id": "previous",
            "label": "Have you done leadership assessments before? What worked or did not?",
            "type": "textarea",
            "placeholder": "Optional — helps us avoid past pitfalls..."
          }
        ]
      }
    ]
  },
  "mbti": {
    "headline": "MBTI Assessment Request",
    "intro": "Tell us how you plan to use MBTI so we can design the right workshop and support.",
    "sections": [
      {
        "heading": "Purpose & Format",
        "fields": [
          {
            "id": "purpose",
            "label": "What is MBTI for in your context?",
            "type": "radio",
            "opts": [
              "Individual self-awareness",
              "Team building and communication",
              "Manager / leadership development",
              "Integration into a larger programme",
              "Coaching support tool",
              "Other"
            ]
          },
          {
            "id": "format",
            "label": "Preferred delivery format",
            "type": "radio",
            "opts": [
              "Individual online assessment + one-on-one debrief",
              "Group workshop — half day",
              "Group workshop — full day",
              "Integrated into existing programme",
              "To be designed with Edstellar"
            ]
          },
          {
            "id": "headcount",
            "label": "Number of participants",
            "type": "select",
            "opts": [
              "1–10",
              "11–25",
              "26–50",
              "51–100",
              "100+"
            ]
          }
        ]
      },
      {
        "heading": "Facilitator & Language",
        "fields": [
          {
            "id": "facilitator",
            "label": "Do you need a certified MBTI facilitator?",
            "type": "radio",
            "opts": [
              "Yes — please provide",
              "We have an internal certified facilitator",
              "Not sure"
            ]
          },
          {
            "id": "language",
            "label": "Language preference",
            "type": "select",
            "opts": [
              "English",
              "Hindi",
              "Tamil",
              "Telugu",
              "Other / to discuss"
            ]
          },
          {
            "id": "followup",
            "label": "Is post-session coaching or individual follow-up required?",
            "type": "radio",
            "opts": [
              "Yes — individual coaching",
              "Yes — manager briefing only",
              "No",
              "Open to recommendation"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Tell us about the team or situation",
            "type": "textarea",
            "placeholder": "e.g. We have a cross-functional leadership team of 18 people. After a restructure, we are struggling with communication and decision-making speed and want a shared language..."
          }
        ]
      }
    ]
  },
  "disc": {
    "headline": "DISC Assessment Request",
    "intro": "Help us understand your team and objective so we can design the right DISC intervention.",
    "sections": [
      {
        "heading": "Purpose & Scope",
        "fields": [
          {
            "id": "purpose",
            "label": "Primary objective",
            "type": "radio",
            "opts": [
              "Improve team communication",
              "Manager effectiveness",
              "Sales team performance",
              "Customer service orientation",
              "Conflict resolution",
              "Onboarding / new team integration",
              "Other"
            ]
          },
          {
            "id": "headcount",
            "label": "Team or participant size",
            "type": "select",
            "opts": [
              "1–10",
              "11–25",
              "26–50",
              "51–100",
              "100+"
            ]
          },
          {
            "id": "team_context",
            "label": "Is this for one team or multiple teams?",
            "type": "radio",
            "opts": [
              "Single team",
              "Multiple teams (same session)",
              "Multiple teams (separate sessions)",
              "Department-wide rollout"
            ]
          }
        ]
      },
      {
        "heading": "Delivery & Follow-up",
        "fields": [
          {
            "id": "format",
            "label": "Preferred delivery",
            "type": "radio",
            "opts": [
              "Assessment reports only",
              "Assessment + half-day workshop",
              "Assessment + full-day workshop",
              "Manager briefing session",
              "Integrated into a larger programme"
            ]
          },
          {
            "id": "followup",
            "label": "Is follow-up coaching or support needed?",
            "type": "radio",
            "opts": [
              "Yes — team coaching sessions",
              "Yes — individual coaching for managers",
              "Not required",
              "Open to recommendation"
            ]
          },
          {
            "id": "language",
            "label": "Language preference",
            "type": "select",
            "opts": [
              "English",
              "Hindi",
              "Regional language (please specify)",
              "Bilingual"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Describe the team situation and what you hope DISC achieves",
            "type": "textarea",
            "placeholder": "e.g. Our sales team of 12 has communication challenges. The manager is new and wants a framework to understand different working styles before the year-end push..."
          }
        ]
      }
    ]
  },
  "feedback_360": {
    "headline": "360° Feedback Programme Request",
    "intro": "Tell us about the feedback programme you need so we can recommend the right design.",
    "sections": [
      {
        "heading": "Scope & Purpose",
        "fields": [
          {
            "id": "purpose",
            "label": "Purpose of the 360° programme",
            "type": "radio",
            "opts": [
              "Development only (no tie to ratings)",
              "Performance calibration",
              "Promotion / succession decision",
              "Executive coaching input",
              "Team health check",
              "Other"
            ]
          },
          {
            "id": "raters",
            "label": "Who will provide feedback? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Direct manager",
              "Peers / colleagues",
              "Direct reports",
              "Internal clients / stakeholders",
              "External clients",
              "Self-assessment only"
            ]
          },
          {
            "id": "target_level",
            "label": "Level of employees being assessed",
            "type": "checkbox",
            "opts": [
              "Individual contributors",
              "Team leads",
              "Mid-level managers",
              "Senior leaders",
              "C-suite"
            ]
          },
          {
            "id": "headcount",
            "label": "Number of employees to be assessed",
            "type": "select",
            "opts": [
              "1–10",
              "11–25",
              "26–50",
              "50–100",
              "100+"
            ]
          }
        ]
      },
      {
        "heading": "Design & Reporting",
        "fields": [
          {
            "id": "competency_framework",
            "label": "Do you have an existing competency framework to base questions on?",
            "type": "radio",
            "opts": [
              "Yes — will share with Edstellar",
              "Partially — some competencies defined",
              "No — need Edstellar to design",
              "Not sure"
            ]
          },
          {
            "id": "report_type",
            "label": "Type of report needed",
            "type": "checkbox",
            "opts": [
              "Individual report per employee",
              "Aggregate / team report",
              "Department-level heat map",
              "Organisation-wide summary"
            ]
          },
          {
            "id": "debrief",
            "label": "Is facilitated debrief required?",
            "type": "radio",
            "opts": [
              "Yes — HR / manager debriefs each employee",
              "Yes — group debrief workshop",
              "No — reports shared directly",
              "Open to recommendation"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Describe the context and what you want to achieve",
            "type": "textarea",
            "placeholder": "e.g. We have 30 mid-managers and want to run an annual 360 before our year-end performance review cycle in November. We need individual and manager summary reports..."
          }
        ]
      }
    ]
  },
  "tna": {
    "headline": "Training Needs Analysis (TNA) Request",
    "intro": "A well-designed TNA saves budget and ensures every rupee of L&D spend is targeted. Tell us about yours.",
    "sections": [
      {
        "heading": "Trigger & Scope",
        "fields": [
          {
            "id": "trigger",
            "label": "What has triggered this TNA? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "New business strategy or direction",
              "Identified performance gaps",
              "New role or function being launched",
              "Annual L&D planning cycle",
              "New leadership / HR Director",
              "Compliance or regulatory requirement",
              "Post-merger integration",
              "Other"
            ]
          },
          {
            "id": "scope",
            "label": "Scope of the TNA",
            "type": "radio",
            "opts": [
              "Individual / role level",
              "Team / department level",
              "Business unit level",
              "Organisation-wide",
              "Specific role family (e.g. all managers)"
            ]
          },
          {
            "id": "headcount",
            "label": "Approximate number of employees in scope",
            "type": "select",
            "opts": [
              "Under 50",
              "50–200",
              "200–500",
              "500–1,000",
              "1,000+"
            ]
          },
          {
            "id": "priority_areas",
            "label": "Priority capability areas (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Leadership and management",
              "Technical / functional skills",
              "Compliance and governance",
              "Digital and technology",
              "Sales and customer management",
              "Soft skills and communication",
              "Not yet defined"
            ]
          }
        ]
      },
      {
        "heading": "Current State",
        "fields": [
          {
            "id": "current_ld",
            "label": "Current state of your L&D function",
            "type": "radio",
            "opts": [
              "Nascent — building from scratch",
              "Growing — established but maturing",
              "Mature — well-resourced and structured"
            ]
          },
          {
            "id": "existing_data",
            "label": "What data or information already exists?",
            "type": "checkbox",
            "opts": [
              "Job descriptions / JDs",
              "Competency framework",
              "Performance data",
              "Employee surveys",
              "Prior TNA reports",
              "Exit interview themes",
              "None of the above"
            ]
          }
        ]
      },
      {
        "heading": "Expected Output",
        "fields": [
          {
            "id": "deliverable",
            "label": "Expected deliverable from the TNA (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Gap analysis report",
              "Prioritised training calendar",
              "ROI / business case for L&D spend",
              "Competency-skills mapping",
              "Learning programme recommendations",
              "Full L&D strategy document"
            ]
          },
          {
            "id": "context",
            "label": "Describe the situation in your own words",
            "type": "textarea",
            "placeholder": "e.g. We're a pharma company of 400 people. The HR Director wants to baseline capability in the commercial team before the new FY planning begins in October. We have JDs but no competency framework yet..."
          }
        ]
      }
    ]
  },
  "learning_strategy": {
    "headline": "Learning Strategy & Design Request",
    "intro": "Tell us where you are and where you want to get to — we will help you design the journey.",
    "sections": [
      {
        "heading": "Current State",
        "fields": [
          {
            "id": "current_state",
            "label": "How would you describe your current L&D function?",
            "type": "radio",
            "opts": [
              "No formal L&D function — ad hoc training only",
              "Emerging — some structure, limited capability",
              "Established — multiple programmes running",
              "Mature — strategic, data-driven, well-funded"
            ]
          },
          {
            "id": "existing_infra",
            "label": "What currently exists? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "LMS / e-learning platform",
              "Annual training calendar",
              "Onboarding programme",
              "Leadership development programme",
              "Competency framework",
              "L&D team (in-house)",
              "L&D budget (ring-fenced)",
              "None of the above"
            ]
          }
        ]
      },
      {
        "heading": "Strategic Goals",
        "fields": [
          {
            "id": "goals",
            "label": "What do you want the new learning strategy to achieve? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Align learning to business strategy",
              "Build internal capability faster",
              "Reduce dependency on external training",
              "Enable self-directed learning",
              "Improve L&D ROI measurement",
              "Scale across geographies",
              "Digitalise the learning experience",
              "Build a learning culture"
            ]
          },
          {
            "id": "priority_audience",
            "label": "Priority audience for the strategy",
            "type": "checkbox",
            "opts": [
              "All employees",
              "Managers and leaders only",
              "High-potential talent",
              "Technical specialists",
              "Customer-facing roles",
              "New joiners / onboarding"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Tell us about the business context and what success looks like",
            "type": "textarea",
            "placeholder": "e.g. We are a 600-person fintech scaling rapidly. The CHRO wants a 3-year L&D roadmap that can grow with us. We currently rely entirely on external vendors..."
          },
          {
            "id": "timeline",
            "label": "When do you need the strategy delivered?",
            "type": "select",
            "opts": [
              "Within 6 weeks",
              "Within 3 months",
              "Within 6 months",
              "This financial year",
              "Flexible"
            ]
          }
        ]
      }
    ]
  },
  "compliance": {
    "headline": "Compliance & Safety Training Request",
    "intro": "Compliance training needs to be accurate, engaging and trackable. Tell us exactly what you need.",
    "sections": [
      {
        "heading": "Topic & Requirement",
        "fields": [
          {
            "id": "topic",
            "label": "Which compliance area(s) do you need training on?",
            "type": "checkbox",
            "opts": [
              "POSH / Prevention of Sexual Harassment",
              "Data Privacy (GDPR / India DPDP)",
              "Workplace Safety & HSE",
              "Anti-bribery and Corruption",
              "Ethics and Code of Conduct",
              "Financial compliance / SEBI",
              "Industry-specific (please specify below)",
              "Multiple / to be discussed"
            ]
          },
          {
            "id": "mandatory",
            "label": "Is this mandatory / statutory training?",
            "type": "radio",
            "opts": [
              "Yes — legally mandated (e.g. POSH)",
              "Yes — company policy mandate",
              "Recommended but not yet mandatory",
              "We are not sure"
            ]
          },
          {
            "id": "deadline",
            "label": "Is there a regulatory or audit deadline?",
            "type": "radio",
            "opts": [
              "Yes — hard deadline (please mention below)",
              "Yes — preferred but flexible",
              "No hard deadline"
            ]
          }
        ]
      },
      {
        "heading": "Participants & Format",
        "fields": [
          {
            "id": "headcount",
            "label": "Number of employees to be trained",
            "type": "select",
            "opts": [
              "Under 25",
              "25–50",
              "51–100",
              "101–250",
              "250–500",
              "500+"
            ]
          },
          {
            "id": "participant_types",
            "label": "Who needs to be trained? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "All employees (mandatory)",
              "Managers / supervisors",
              "Internal Committee (IC) members",
              "New joiners (onboarding)",
              "Specific departments",
              "Board / leadership"
            ]
          },
          {
            "id": "format",
            "label": "Preferred training format",
            "type": "checkbox",
            "opts": [
              "In-person classroom",
              "Virtual / online live session",
              "Self-paced e-learning module",
              "Blended (live + self-paced)",
              "Mobile microlearning",
              "Video-based"
            ]
          }
        ]
      },
      {
        "heading": "Compliance & Reporting",
        "fields": [
          {
            "id": "certification",
            "label": "Is a certificate of completion required?",
            "type": "radio",
            "opts": [
              "Yes — individual certificates with tracking",
              "Yes — aggregate completion report for audit",
              "No",
              "Not sure"
            ]
          },
          {
            "id": "frequency",
            "label": "Training frequency",
            "type": "radio",
            "opts": [
              "One-time",
              "Annual refresher",
              "Quarterly",
              "On-demand / as needed for new joiners"
            ]
          },
          {
            "id": "context",
            "label": "Any specific compliance context or regulatory requirement?",
            "type": "textarea",
            "placeholder": "e.g. We are a 300-person IT company and need POSH training for IC members and all employees by 31 December for our SEBI compliance report..."
          }
        ]
      }
    ]
  },
  "leadership_training": {
    "headline": "Leadership Training Request",
    "intro": "Tell us about the leadership challenge you are solving so we can design the right programme.",
    "sections": [
      {
        "heading": "Programme Scope",
        "fields": [
          {
            "id": "target_level",
            "label": "Who is this for? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "New / first-time managers (0–2 yrs)",
              "Mid-level managers",
              "Senior managers / directors",
              "VP / C-1 leaders",
              "High-potential / Hi-Po employees",
              "All leadership levels"
            ]
          },
          {
            "id": "headcount",
            "label": "Number of participants",
            "type": "select",
            "opts": [
              "5–10",
              "11–20",
              "21–40",
              "41–80",
              "80+"
            ]
          },
          {
            "id": "theme",
            "label": "Primary leadership themes (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Leading and managing people",
              "Giving and receiving feedback",
              "Coaching skills",
              "Strategic thinking",
              "Stakeholder management",
              "Delegation and empowerment",
              "Building high-performing teams",
              "Executive presence and influence",
              "Change leadership"
            ]
          }
        ]
      },
      {
        "heading": "Delivery Design",
        "fields": [
          {
            "id": "format",
            "label": "Preferred delivery format",
            "type": "radio",
            "opts": [
              "In-person (ILT)",
              "Virtual (VILT)",
              "Blended (ILT + digital)",
              "Action learning sets",
              "Cohort-based with peer coaching",
              "To be designed with Edstellar"
            ]
          },
          {
            "id": "duration",
            "label": "Programme duration",
            "type": "radio",
            "opts": [
              "Single day workshop",
              "2–3 day intensive",
              "Multi-month journey (monthly modules)",
              "12-month full programme",
              "Flexible / open to recommendation"
            ]
          },
          {
            "id": "assessment",
            "label": "Should the programme include assessment or measurement?",
            "type": "checkbox",
            "opts": [
              "Pre/post skills assessment",
              "360° feedback",
              "Behavioural observation",
              "Individual development plan",
              "Manager check-in / sign-off",
              "No formal assessment needed"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Describe the leadership challenge you are trying to solve",
            "type": "textarea",
            "placeholder": "e.g. We promoted 14 individual contributors to manager roles last year with no formal preparation. They're struggling with delegation and giving feedback. We want a 3-month cohort programme..."
          },
          {
            "id": "current_challenges",
            "label": "What specific leadership behaviours or gaps prompted this request?",
            "type": "textarea",
            "placeholder": "e.g. Low engagement scores, high attrition in teams led by new managers, feedback from exit interviews..."
          }
        ]
      }
    ]
  },
  "soft_skills": {
    "headline": "Soft Skills Training Request",
    "intro": "Tell us about the skills gap and audience so we can design an impactful programme.",
    "sections": [
      {
        "heading": "Skill & Audience",
        "fields": [
          {
            "id": "skill_area",
            "label": "Which skills area(s)? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Communication and presentation",
              "Business writing",
              "Active listening",
              "Negotiation and influencing",
              "Conflict management",
              "Customer service",
              "Time management and productivity",
              "Collaboration and teamwork",
              "Emotional intelligence (EQ)",
              "Diversity, equity and inclusion",
              "Other"
            ]
          },
          {
            "id": "audience",
            "label": "Who is this for?",
            "type": "checkbox",
            "opts": [
              "All employees",
              "Frontline / individual contributors",
              "Customer-facing teams",
              "Managers",
              "Senior leaders",
              "Specific department (please mention)"
            ]
          },
          {
            "id": "headcount",
            "label": "Number of participants",
            "type": "select",
            "opts": [
              "Under 25",
              "25–50",
              "51–100",
              "101–200",
              "200+"
            ]
          }
        ]
      },
      {
        "heading": "Delivery",
        "fields": [
          {
            "id": "format",
            "label": "Preferred delivery format",
            "type": "radio",
            "opts": [
              "In-person workshop",
              "Virtual live session",
              "Self-paced e-learning",
              "Blended",
              "Short modules / microlearning",
              "Role-play and simulation"
            ]
          },
          {
            "id": "duration",
            "label": "Session duration preference",
            "type": "radio",
            "opts": [
              "2–4 hour session",
              "Half day",
              "Full day",
              "Multi-session journey (e.g. 4 x 2hr over a month)",
              "Flexible"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "What has prompted this request and what does success look like?",
            "type": "textarea",
            "placeholder": "e.g. Our customer success team of 30 gets low scores on communication in CSAT surveys. We want a half-day workshop on active listening and clear written communication..."
          }
        ]
      }
    ]
  },
  "technical": {
    "headline": "Technical / Domain Training Request",
    "intro": "Tell us about the technical skills gap and your team so we can recommend the right programme.",
    "sections": [
      {
        "heading": "Skills & Domain",
        "fields": [
          {
            "id": "domain",
            "label": "Domain / subject area",
            "type": "checkbox",
            "opts": [
              "Data analytics and Excel",
              "Artificial intelligence / ML tools",
              "Cybersecurity awareness",
              "Cloud computing basics",
              "Finance and accounting",
              "Sales and CRM tools",
              "Project management (PMP / Agile)",
              "HR and people management tools",
              "Operations / supply chain",
              "Industry-specific (please specify)"
            ]
          },
          {
            "id": "audience_role",
            "label": "Role profile of participants",
            "type": "textarea",
            "placeholder": "e.g. Business analysts, finance managers, or sales executives with 2–5 years experience..."
          },
          {
            "id": "headcount",
            "label": "Number of participants",
            "type": "select",
            "opts": [
              "Under 20",
              "20–50",
              "50–100",
              "100–200",
              "200+"
            ]
          },
          {
            "id": "current_level",
            "label": "Current skill level of participants",
            "type": "radio",
            "opts": [
              "Beginner — very limited exposure",
              "Intermediate — some experience but gaps",
              "Advanced — need specialist upskilling"
            ]
          }
        ]
      },
      {
        "heading": "Delivery",
        "fields": [
          {
            "id": "format",
            "label": "Preferred training format",
            "type": "radio",
            "opts": [
              "Instructor-led classroom",
              "Virtual live session",
              "Hands-on lab / simulation",
              "Self-paced e-learning",
              "Blended programme"
            ]
          },
          {
            "id": "certification",
            "label": "Is a certification or credential needed at the end?",
            "type": "radio",
            "opts": [
              "Yes — accredited certification required",
              "Yes — internal completion certificate only",
              "No",
              "Not sure"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Describe the skills gap and business need",
            "type": "textarea",
            "placeholder": "e.g. Our 25-person data team needs upskilling from Excel to Python for analytics. We want a structured 8-week blended programme with hands-on exercises and a final assessment..."
          }
        ]
      }
    ]
  },
  "sip": {
    "headline": "Skills Intelligence Platform (SIP) Request",
    "intro": "Tell us about your workforce intelligence goals — we will map the right platform scope and implementation.",
    "sections": [
      {
        "heading": "Use Case & Goals",
        "fields": [
          {
            "id": "primary_use",
            "label": "What will you primarily use the platform for? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Skills mapping and taxonomy design",
              "Workforce capability dashboards",
              "Identifying skill gaps at org level",
              "Succession and talent planning",
              "L&D programme alignment to skills",
              "Board / leadership reporting",
              "HRIS integration and automation",
              "Benchmarking against industry"
            ]
          },
          {
            "id": "headcount",
            "label": "Workforce size (employees to be mapped)",
            "type": "select",
            "opts": [
              "Under 100",
              "100–500",
              "500–1,000",
              "1,000–5,000",
              "5,000+"
            ]
          },
          {
            "id": "data_maturity",
            "label": "Current skills data maturity",
            "type": "radio",
            "opts": [
              "No existing skills data at all",
              "Some job descriptions exist but no taxonomy",
              "Competency frameworks exist for some roles",
              "Detailed skills library already defined",
              "Skills mapped in another system"
            ]
          }
        ]
      },
      {
        "heading": "Integration & Infrastructure",
        "fields": [
          {
            "id": "existing_systems",
            "label": "Current systems to integrate with (select all that apply)",
            "type": "checkbox",
            "opts": [
              "SAP SuccessFactors",
              "Workday",
              "Darwinbox",
              "Keka / GreytHR",
              "Custom HRMS",
              "LMS (please specify)",
              "Excel / no system",
              "Other"
            ]
          },
          {
            "id": "api_need",
            "label": "API integration requirement",
            "type": "radio",
            "opts": [
              "Yes — two-way sync with HRMS",
              "Yes — data import only",
              "Not sure",
              "Not required"
            ]
          },
          {
            "id": "timeline",
            "label": "Expected go-live timeline",
            "type": "radio",
            "opts": [
              "Within 3 months",
              "3–6 months",
              "6–12 months",
              "Exploring — no fixed date"
            ]
          }
        ]
      },
      {
        "heading": "Business Context",
        "fields": [
          {
            "id": "context",
            "label": "What business outcome are you trying to achieve?",
            "type": "textarea",
            "placeholder": "e.g. Our CHRO wants to present a skills heat map to the board by Q3 and we have no structured data today. We have Darwinbox but haven't used its skills module..."
          },
          {
            "id": "stakeholders",
            "label": "Key internal stakeholders for this project",
            "type": "checkbox",
            "opts": [
              "CHRO / HR Director",
              "CTO / IT team",
              "L&D head",
              "Finance / CFO",
              "Business unit heads",
              "External consultants already engaged"
            ]
          }
        ]
      }
    ]
  },
  "imperium": {
    "headline": "Imperium Executive Retreat Request",
    "intro": "Imperium retreats are curated for senior leadership — tell us about your context and we will design the perfect experience.",
    "sections": [
      {
        "heading": "Participants & Purpose",
        "fields": [
          {
            "id": "purpose",
            "label": "Primary purpose of the retreat",
            "type": "radio",
            "opts": [
              "Annual leadership offsite",
              "Strategic alignment workshop",
              "Team cohesion and trust building",
              "Leadership development accelerator",
              "Post-restructure alignment",
              "Board development session",
              "Celebration and recognition"
            ]
          },
          {
            "id": "participant_level",
            "label": "Who will attend? (select all that apply)",
            "type": "checkbox",
            "opts": [
              "CEO / MD",
              "C-suite (CFO, CMO, CHRO, etc.)",
              "Business unit heads / Presidents",
              "Senior VPs and Directors",
              "Extended leadership team (broad group)"
            ]
          },
          {
            "id": "headcount",
            "label": "Number of participants",
            "type": "select",
            "opts": [
              "5–10",
              "11–20",
              "21–40",
              "40–70",
              "70+"
            ]
          }
        ]
      },
      {
        "heading": "Format & Experience",
        "fields": [
          {
            "id": "duration",
            "label": "Preferred retreat duration",
            "type": "radio",
            "opts": [
              "Half day experience",
              "Full day (off-site)",
              "2 days residential",
              "3 days residential",
              "Flexible — open to Edstellar recommendation"
            ]
          },
          {
            "id": "location",
            "label": "Location preference",
            "type": "radio",
            "opts": [
              "Domestic India (Tier 1 city)",
              "Domestic India (leisure / resort)",
              "International (Southeast Asia)",
              "International (other)",
              "At our premises",
              "Open to recommendation"
            ]
          },
          {
            "id": "themes",
            "label": "Key themes for the retreat (select all that apply)",
            "type": "checkbox",
            "opts": [
              "Strategic vision and alignment",
              "Leadership effectiveness and style",
              "Innovation and future readiness",
              "Team trust and psychological safety",
              "Culture and values reinforcement",
              "Succession and next-gen leadership",
              "Personal leadership mastery",
              "Wellbeing and resilience"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Tell us about the leadership context and what success looks like",
            "type": "textarea",
            "placeholder": "e.g. We have a new CEO who joined 6 months ago and wants to align the top 12 leaders on a 3-year vision before budget planning in October. The team is geographically spread..."
          },
          {
            "id": "past_retreats",
            "label": "Have you done a similar retreat before? What worked or what would you change?",
            "type": "textarea",
            "placeholder": "Optional — helps us design something fresh and impactful..."
          }
        ]
      }
    ]
  },
  "default": {
    "headline": "Service Request",
    "intro": "Tell us about your requirement and we'll get back within 2 business days.",
    "sections": [
      {
        "heading": "Your Requirement",
        "fields": [
          {
            "id": "what_need",
            "label": "What are you trying to achieve?",
            "type": "textarea",
            "placeholder": "Describe the business problem or learning need you want to solve..."
          },
          {
            "id": "audience",
            "label": "Who is this for?",
            "type": "textarea",
            "placeholder": "e.g. 50 mid-level managers across Sales and HR..."
          },
          {
            "id": "headcount",
            "label": "Number of employees involved",
            "type": "select",
            "opts": [
              "Under 25",
              "25–100",
              "100–250",
              "250–500",
              "500+"
            ]
          },
          {
            "id": "priority_level",
            "label": "How urgent is this?",
            "type": "radio",
            "opts": [
              "Critical — needed ASAP",
              "High — within next 3 months",
              "Medium — within 6 months",
              "Low — planning stage / exploring"
            ]
          }
        ]
      },
      {
        "heading": "Delivery Preferences",
        "fields": [
          {
            "id": "format",
            "label": "Preferred format",
            "type": "checkbox",
            "opts": [
              "In-person / classroom",
              "Virtual live session",
              "Blended",
              "Self-paced digital",
              "Not sure — open to recommendation"
            ]
          },
          {
            "id": "timeline",
            "label": "Timeline",
            "type": "select",
            "opts": [
              "This quarter",
              "Next quarter",
              "Within 6 months",
              "This financial year",
              "Flexible"
            ]
          },
          {
            "id": "budget",
            "label": "Indicative budget",
            "type": "select",
            "opts": [
              "To be discussed",
              "Under ₹5L",
              "₹5L – ₹20L",
              "₹20L – ₹50L",
              "₹50L+"
            ]
          }
        ]
      },
      {
        "heading": "Context",
        "fields": [
          {
            "id": "context",
            "label": "Anything else we should know?",
            "type": "textarea",
            "placeholder": "e.g. constraints, past experiences, internal stakeholders, systems to integrate with..."
          }
        ]
      }
    ]
  }
};

/** The question set for a service, always resolving to something renderable. */
export function formFor(formKey) {
  return SERVICE_FORMS[formKey] ?? SERVICE_FORMS.default;
}

/** Statuses a request moves through, and the chip each one wears. */
export const REQUEST_STATUSES = [
  { key: "pending", label: "Pending", chip: "chip-warning" },
  { key: "in_discussion", label: "In discussion", chip: "chip-progress" },
  { key: "proposal_sent", label: "Proposal sent", chip: "chip-complete" },
  { key: "closed", label: "Closed", chip: "chip-idle" },
];

export function statusOf(key) {
  return REQUEST_STATUSES.find((s) => s.key === key) ?? REQUEST_STATUSES[0];
}
