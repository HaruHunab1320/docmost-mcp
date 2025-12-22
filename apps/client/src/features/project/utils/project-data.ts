import { Project } from "../types";

export function getProjectsArray(projectsData: any): Project[] {
  if (!projectsData) return [];
  if (Array.isArray(projectsData.data)) return projectsData.data;
  if (Array.isArray(projectsData.items)) return projectsData.items;
  if (projectsData.data && Array.isArray(projectsData.data.items)) {
    return projectsData.data.items;
  }
  return [];
}
