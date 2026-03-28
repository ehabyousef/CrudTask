import { useState } from "react";
import type { Task, TaskColumn, TaskPriority } from "../store/taskStore";

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  column: TaskColumn;
}

interface AddTaskDialogProps {
  show: boolean;
  mode: "add" | "edit";
  column: TaskColumn;
  task?: Task | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void | Promise<void>;
}

export function AddTaskDialog({
  show,
  mode,
  column,
  task,
  submitting = false,
  onClose,
  onSubmit,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState(mode === "edit" && task ? task.title : "");
  const [description, setDescription] = useState(
    mode === "edit" && task ? task.description : "",
  );
  const [priority, setPriority] = useState<TaskPriority>(
    mode === "edit" && task ? task.priority : "MEDIUM",
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    await onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      priority,
      column,
    });
  };

  if (!show) {
    return null;
  }

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {mode === "add" ? "Add task" : "Update task"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                  disabled={submitting}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label" htmlFor="task-title">
                    Title
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="task-description">
                    Description
                  </label>
                  <textarea
                    id="task-description"
                    className="form-control"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="task-priority">
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    className="form-select"
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as TaskPriority)
                    }
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? mode === "add"
                      ? "Adding..."
                      : "Updating..."
                    : mode === "add"
                      ? "Add task"
                      : "Update task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show"></div>
    </>
  );
}
