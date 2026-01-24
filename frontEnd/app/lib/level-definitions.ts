export interface LevelDefinition {
  level: number;
  label: string;
  description: string;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { level: 1, label: "Beginner", description: "Just started, don't have any idea" },
  { level: 2, label: "Beginner (few months)", description: "Beginner with few months of experience" },
  { level: 3, label: "Motivating Back", description: "I made it in the past, decided to come back" },
  { level: 4, label: "Keep up with pre-intermediate", description: "I can keep up with pre intermediates" },
  { level: 5, label: "Pre-Intermediate", description: "Between beginner+ and intermediate" },
  { level: 6, label: "Intermediate", description: "I can make it confidently and aggressively" },
  { level: 7, label: "Feeling very good", description: "Started to feel that I'm very good" },
  { level: 8, label: "High Performer", description: "I can compete with professionals" },
  { level: 9, label: "Very High Performer", description: "More than 15 years experience with mental maturation" },
  { level: 10, label: "Elite", description: "Top of the category, best of the best" },
];

export function getLevelDefinition(level: number): LevelDefinition | undefined {
  return LEVEL_DEFINITIONS.find((d) => d.level === level);
}
