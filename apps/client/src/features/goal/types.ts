export type GoalHorizon = "short" | "mid" | "long";

export interface Goal {
  id: string;
  workspaceId: string;
  spaceId?: string | null;
  name: string;
  horizon: GoalHorizon;
  description?: string | null;
  keywords?: string[] | null;
  createdAt: string;
  updatedAt: string;
}
