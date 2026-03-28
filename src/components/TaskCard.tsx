import styles from "./tasksCard.module.css";
import type { Task } from "../store/taskStore";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const getPriorityBadgeClass = (priority: Task["priority"]) => {
    switch (priority) {
      case "HIGH":
        return styles.badgeHigh;
      case "MEDIUM":
        return styles.badgeMedium;
      case "LOW":
        return styles.badgeLow;
      default:
        return styles.badgeDefault;
    }
  };

  return (
    <div className={`${styles.taskCard} shadow-sm`}>
      <h3 className={styles.taskTitle}>{task.title}</h3>
      <p className={styles.taskDescription}>{task.description}</p>
      <div className={styles.taskFooter}>
        <span className={getPriorityBadgeClass(task.priority)}>
          {task.priority}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
