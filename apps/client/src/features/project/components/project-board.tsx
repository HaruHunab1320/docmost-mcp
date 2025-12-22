import { Board } from "./board";
import { Project } from "../types";

interface ProjectBoardProps {
  project: Project;
  onBack: () => void;
}

export function ProjectBoard({ project, onBack }: ProjectBoardProps) {
  return <Board project={project} onBack={onBack} />;
}
