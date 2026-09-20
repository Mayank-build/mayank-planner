import { Category, PlannerTask } from "./types";

export const starterCategories: Category[] = [
  { id: "college", name: "College", icon: "⌘", accent: "violet", description: "Classes, exams & assignments", order: 1 },
  { id: "skills", name: "Technical Skills", icon: "</>", accent: "blue", description: "Build the skills that matter", order: 2 },
  { id: "gym", name: "Gym", icon: "◈", accent: "orange", description: "Strength, energy & discipline", order: 3 },
  { id: "running", name: "Running", icon: "↗", accent: "green", description: "Move further, feel better", order: 4 },
  { id: "content", name: "Content", icon: "✦", accent: "pink", description: "Ideas and posts for your voice", order: 5 }
];

export function demoTasks(today: Date): PlannerTask[] {
  const iso = (offset: number) => {
    const date = new Date(today); date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  return [
    { id: "welcome-1", categoryId: "college", title: "Review data structures lecture", plannedDate: iso(0), deadline: iso(0), notes: "Focus on trees and graphs.", status: "open", createdAt: new Date().toISOString() },
    { id: "welcome-2", categoryId: "skills", title: "Finish React component practice", plannedDate: iso(1), deadline: iso(2), status: "open", createdAt: new Date().toISOString() },
    { id: "welcome-3", categoryId: "gym", title: "Push day — chest & shoulders", plannedDate: iso(0), status: "done", completedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: "welcome-4", categoryId: "running", title: "Easy 3 km run", plannedDate: iso(2), status: "open", createdAt: new Date().toISOString() },
    { id: "welcome-5", categoryId: "content", title: "LinkedIn post: What college taught me this week", plannedDate: iso(3), deadline: iso(3), status: "open", platform: "LinkedIn", contentStatus: "Draft", createdAt: new Date().toISOString() }
  ];
}
