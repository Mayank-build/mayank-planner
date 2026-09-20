export type CategoryKey = "college" | "skills" | "gym" | "running" | "content" | string;
export type TaskStatus = "open" | "done";
export type ContentPlatform = "Instagram" | "LinkedIn" | "X";
export type ContentStatus = "Idea" | "Draft" | "Planned" | "Published";

export interface Category {
  id: CategoryKey;
  name: string;
  icon: string;
  accent: string;
  description: string;
  order: number;
}

export interface PlannerTask {
  id: string;
  categoryId: CategoryKey;
  title: string;
  plannedDate: string;
  deadline?: string;
  notes?: string;
  status: TaskStatus;
  completedAt?: string;
  platform?: ContentPlatform;
  contentStatus?: ContentStatus;
  createdAt: string;
}
