export type ServiceRequestTargetType = "coach" | "performance";

export type QuestionFieldType =
  | "sport_select"
  | "level_confirm"
  | "single_choice"
  | "location"
  | "multi_choice"
  | "textarea"
  | "consent";

export type ServiceRequestQuestion = {
  key: string;
  question: string;
  type: QuestionFieldType;
  options?: string[];
  targets: ServiceRequestTargetType[];
  helperText?: string;
};

export const SPORTS_GOAL_OPTIONS = [
  "Just started, I don't have any idea what to do",
  "Beginner with few months of experience",
  "Motivating Back - I made it in the past, decided to come back",
  "I want to keep up with pre intermediates",
  "I want to keep up with intermediates",
  "I want to keep up with professionals",
  "I want to be a champion and have long term commitment",
] as const;

export const SERVICE_REQUEST_QUESTIONS: ServiceRequestQuestion[] = [
  {
    key: "sportGroupBranch",
    question: "Sport group and branch",
    type: "sport_select",
    targets: ["coach"],
    helperText: "Select the sport group and branch you need coaching for.",
  },
  {
    key: "level",
    question: "Your level",
    type: "level_confirm",
    targets: ["coach", "performance"],
    helperText: "Confirm the level from your gamer profile or adjust if needed.",
  },
  {
    key: "sportsGoal",
    question: "Your sports goal",
    type: "single_choice",
    options: [...SPORTS_GOAL_OPTIONS],
    targets: ["coach", "performance"],
  },
  {
    key: "sessionFormat",
    question: "Private lesson or group lesson?",
    type: "single_choice",
    options: ["Private lesson", "Group lesson"],
    targets: ["coach", "performance"],
  },
  {
    key: "instructorGender",
    question: "Instructor gender preference",
    type: "single_choice",
    options: ["No preference", "Male instructor", "Female instructor"],
    targets: ["coach", "performance"],
  },
  {
    key: "location",
    question: "Country, city, and district",
    type: "location",
    targets: ["coach", "performance"],
    helperText: "Prefilled from your profile. Update if needed.",
  },
  {
    key: "budget",
    question: "Monthly budget",
    type: "single_choice",
    options: ["I have set a monthly budget", "Let me get a quote"],
    targets: ["coach", "performance"],
  },
  {
    key: "availableDays",
    question: "Which days are you available?",
    type: "multi_choice",
    options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    targets: ["coach", "performance"],
  },
  {
    key: "availableTimes",
    question: "Which time slots work for you?",
    type: "multi_choice",
    options: [
      "Morning (6am–12pm)",
      "Afternoon (12pm–5pm)",
      "Evening (5pm–9pm)",
      "Night (9pm+)",
    ],
    targets: ["coach", "performance"],
  },
  {
    key: "facilityPreference",
    question: "Facility preference",
    type: "single_choice",
    options: ["Private facility", "Open area", "No preference"],
    targets: ["coach", "performance"],
  },
  {
    key: "additionalDetails",
    question: "Any other details?",
    type: "textarea",
    targets: ["coach", "performance"],
    helperText: "Share injuries, schedule notes, or anything providers should know.",
  },
  {
    key: "emailConsent",
    question: "Email contact consent",
    type: "consent",
    targets: ["coach", "performance"],
    helperText: "I allow coaches and providers to contact me via email about this request.",
  },
];

export function questionsForTarget(targetType: ServiceRequestTargetType) {
  return SERVICE_REQUEST_QUESTIONS.filter((q) => q.targets.includes(targetType));
}
