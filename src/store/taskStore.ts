import { create } from "zustand";

// This is where our fake backend
const API_URL = "http://localhost:4000/tasks";

// words are allowed for columns and priorities
export type TaskColumn = "backlog" | "In Progress" | "review" | "Done";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  column: TaskColumn;
}
interface TasksState {
  tasks: Task[];
  searchQuery: string;
  loading: boolean;
  error: string;
  setSearchQuery: (query: string) => void;
  setTasksOrder: (tasks: Task[]) => void;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id">) => Promise<void>; // Omit here as the server makes ids
  updateTask: (id: number, updates: Partial<Omit<Task, "id">>) => Promise<void>; // Partial becauser we onlypass what changed
  deleteTask: (id: number) => Promise<void>;
  moveTask: (id: number, column: TaskColumn) => Promise<void>;
}

const JSON_HEADERS = { "Content-Type": "application/json" };
export const useTasksStore = create<TasksState>()((set, get) => ({
  tasks: [],
  searchQuery: "",
  loading: true,
  error: "",

  setSearchQuery: (query) => set({ searchQuery: query }),
  setTasksOrder: (tasks) => set({ tasks }),

  // get all the tasks
  fetchTasks: async () => {
    set({ loading: true });
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("fetch failed");
      const data: Task[] = await res.json();
      set({ tasks: data, error: "" }); // Yay, we got data! Save it to state and clear any errors.
    } catch {
      set({
        error:
          "Could not connect to API. Make sure json-server is running on port 4000.",
      });
    } finally {
      set({ loading: false });
    }
  },

  // new task
  addTask: async (task) => {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error();
      const created: Task = await res.json();
      set((state) => ({ tasks: [...state.tasks, created], error: "" }));
    } catch {
      set({ error: "Failed to add task." });
      throw new Error("addTask failed");
    }
  },

  // update the task
  updateTask: async (id, updates) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      const updated: Task = await res.json();
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        error: "",
      }));
    } catch {
      set({ error: "Failed to update task." });
      throw new Error("updateTask failed");
    }
  },

  deleteTask: async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        error: "",
      }));
    } catch {
      set({ error: "Could not delete task." });
      throw new Error("deleteTask failed");
    }
  },

  //change the column property when we drag/drop
  moveTask: async (id, column) => {
    await get().updateTask(id, { column });
  },
}));
