import { useState, useEffect, useRef } from "react";
import styles from "./TasksBoard.module.css";
import { AddTaskDialog, type TaskFormValues } from "./components/AddTaskDialog";
import TaskCard from "./components/TaskCard";
import { useTasksStore, type Task, type TaskColumn } from "./store/taskStore";
import { GrAppsRounded } from "react-icons/gr";
import { FiSearch } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

const TASKS_PER_PAGE = 5;

const columns: { key: TaskColumn; label: string; color: string }[] = [
  { key: "backlog", label: "TO DO", color: "blue" },
  { key: "In Progress", label: "IN PROGRESS", color: "orange" },
  { key: "review", label: "IN REVIEW", color: "purple" },
  { key: "Done", label: "Done", color: "green" },
];

const colorClassMap: Record<string, string> = {
  blue: styles.colorBlue,
  orange: styles.colorOrange,
  purple: styles.colorPurple,
  green: styles.colorGreen,
};

// This little invisible component helps us do infinite scrolling
function Infinite({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Set up an observer to check if this div is on the screen
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) onVisible();
    });
    observer.observe(ref.current);
    return () => observer.disconnect(); // Clean up so we don't leak memory
  }, [onVisible]);

  return <div ref={ref} style={{ height: 1 }} />;
}

export default function TasksBoard() {
  const tasks = useTasksStore((state) => state.tasks);
  const searchQuery = useTasksStore((state) => state.searchQuery);
  const error = useTasksStore((state) => state.error);
  const setSearchQuery = useTasksStore((state) => state.setSearchQuery);
  const fetchTasks = useTasksStore((state) => state.fetchTasks);
  const setTasksOrder = useTasksStore((state) => state.setTasksOrder);
  const addTask = useTasksStore((state) => state.addTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  const deleteTask = useTasksStore((state) => state.deleteTask);
  const moveTask = useTasksStore((state) => state.moveTask);

  //states to handle Dialogs popup
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [selectedColumn, setSelectedColumn] = useState<TaskColumn>("backlog");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  //track how many tasks to show per column
  const [visibleCounts, setVisibleCounts] = useState<
    Record<TaskColumn, number>
  >({
    backlog: TASKS_PER_PAGE,
    "In Progress": TASKS_PER_PAGE,
    review: TASKS_PER_PAGE,
    Done: TASKS_PER_PAGE,
  });

  //? used react query to fetch tasks and cashed them, and used isPending for loading.

  const { isPending, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      await fetchTasks();
      return useTasksStore.getState().tasks;
    },
  });

  const isSearching = searchQuery.trim().length > 0;

  //? filter by name
  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Helper to grab only tasks that belong in a certain column (like "backlog" or "Done")
  const getTasksByColumn = (column: TaskColumn) =>
    filteredTasks.filter((task) => task.column === column);

  // Whenever the user types a new search query, reset the infinite scroll
  useEffect(() => {
    setVisibleCounts({
      backlog: TASKS_PER_PAGE,
      "In Progress": TASKS_PER_PAGE,
      review: TASKS_PER_PAGE,
      Done: TASKS_PER_PAGE,
    });
  }, [searchQuery]);

  const openAddTaskDialog = (column: TaskColumn) => {
    setDialogMode("add");
    setSelectedColumn(column);
    setSelectedTask(null);
    setShowTaskDialog(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setDialogMode("edit");
    setSelectedColumn(task.column);
    setSelectedTask(task);
    setShowTaskDialog(true);
  };

  const closeTaskDialog = () => {
    // Prevent closing if it's saving
    if (dialogSubmitting) return;
    setShowTaskDialog(false);
    setSelectedTask(null);
  };

  // Called when the user hits "Save" inside thedialog
  const handleTaskDialogSubmit = async (values: TaskFormValues) => {
    setDialogSubmitting(true); // show a loading spinner or disable buttons
    try {
      if (dialogMode === "add") {
        await addTask(values); // Create a new one
      } else if (selectedTask) {
        await updateTask(selectedTask.id, values); // Edit the existing one
      }
      // Re-fetch everything just to be safe that we have the newest data
      await refetch();
      setShowTaskDialog(false);
      setSelectedTask(null);
    } catch {
      // The error is actually stored in zustand! No need to alert here, we might show a red toast later.
    } finally {
      setDialogSubmitting(false); // Done saving!
    }
  };

  // main function to handle when we drop card in new column
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // prevent outside the column
    if (!destination) return;

    const from = source.droppableId as TaskColumn;
    const to = destination.droppableId as TaskColumn;
    if (from === to && source.index === destination.index) return;
    const updated = [...tasks];
    const taskIndex = updated.findIndex((t) => String(t.id) === draggableId);
    if (taskIndex === -1) return;

    const [task] = updated.splice(taskIndex, 1);
    task.column = to; //update its category

    // gettting the new column
    const destColumnTasks = updated.filter((t) => t.column === to);
    const insertAfter = destColumnTasks[destination.index - 1];
    const insertIndex = insertAfter
      ? updated.indexOf(insertAfter) + 1
      : updated.findIndex((t) => t.column === to);

    // Splice it back in at its new spot
    updated.splice(insertIndex === -1 ? updated.length : insertIndex, 0, task);

    // Save our new order to zustand
    setTasksOrder(updated);

    // Try telling the backend that it moved
    if (from !== to) {
      try {
        await moveTask(task.id, to);
      } catch {
        await refetch();
      }
    }
  };

  return (
    // DragDropContext wraps the area where things can be dragged around
    <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
      <div className={styles.boardContainer}>
        {/* Header */}
        <div className={`${styles.boardHeader} px-lg-4 py-2`}>
          <div className="container-fluid">
            <div className="row w-100 align-items-center justify-content-between">
              <div className="col-12 col-md-6">
                <div className="d-flex align-items-center gap-3">
                  <div className={styles.kanbanIcon}>
                    <GrAppsRounded />
                  </div>
                  <div>
                    <h1 className="fs-5 text-black p-0 m-0">KANBAN BOARD</h1>
                    <p className={styles.taskCount}>{tasks.length} tasks</p>
                  </div>
                </div>
              </div>
              <div className="col-2">
                <div className="position-relative w-100">
                  <FiSearch
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary pe-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    className={`form-control ${styles.searchInput}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Board - loop through each of our 4 preset columns to render them */}
        <div className={`${styles.tasksBoard} px-lg-4 pb-4`}>
          <div className="container-fluid h-100">
            <div className="row g-4 h-100">
              {columns.map((column) => {
                const columnTasks = getTasksByColumn(column.key);
                const visibleTasks = columnTasks.slice(
                  0,
                  visibleCounts[column.key],
                );
                const hasMore = visibleTasks.length < columnTasks.length;

                return (
                  <div
                    key={column.key}
                    className="col-12 col-sm-6 col-lg-3 h-100"
                  >
                    <div
                      className={`${styles.tasksColumn} h-100 d-flex flex-column`}
                    >
                      <div
                        className={`${styles.columnHeader} ${colorClassMap[column.color]}`}
                      >
                        <span className={styles.columnDot}></span>
                        <div className="d-flex gap-3 align-items-center flex-fill">
                          <h2 className={styles.columnTitle}>{column.label}</h2>
                          <span className={`${styles.columnCount} badge`}>
                            {columnTasks.length}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`${styles.tasksContainer} d-flex flex-column gap-3 overflow-y-auto`}
                      >
                        {/* Define droppable zones so dragging knows where cards can land */}
                        <Droppable droppableId={column.key}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              {isPending && (
                                <p className={styles.taskDescription}>
                                  Loading tasks...
                                </p>
                              )}

                              {!isPending && columnTasks.length === 0 && (
                                <p className={styles.taskDescription}>
                                  No tasks in this column
                                </p>
                              )}

                              {visibleTasks.map((task, index) => (
                                // Make task card draggable
                                <Draggable
                                  key={task.id}
                                  draggableId={String(task.id)}
                                  index={index}
                                  isDragDisabled={isSearching}
                                >
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      style={{
                                        ...dragProvided.draggableProps.style,
                                        opacity: dragSnapshot.isDragging
                                          ? 0.85
                                          : 1,
                                      }}
                                    >
                                      <TaskCard
                                        task={task}
                                        onEdit={openEditTaskDialog}
                                        onDelete={(id) => void deleteTask(id)}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {/*react-dnd placeholder to make spaces*/}
                              {provided.placeholder}

                              {/* load more tasks when need (infinite scroll) */}
                              {hasMore && (
                                <Infinite
                                  onVisible={() =>
                                    setVisibleCounts((prev) => ({
                                      ...prev,
                                      [column.key]:
                                        prev[column.key] + TASKS_PER_PAGE,
                                    }))
                                  }
                                />
                              )}
                            </div>
                          )}
                        </Droppable>

                        <button
                          type="button"
                          className={`btn btn-sm w-100 ${styles.addTaskBtn} mt-auto`}
                          onClick={() => openAddTaskDialog(column.key)}
                        >
                          + Add task
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="text-danger mt-3 mb-0" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {showTaskDialog && (
          <AddTaskDialog
            show={showTaskDialog}
            mode={dialogMode}
            column={selectedColumn}
            task={selectedTask}
            submitting={dialogSubmitting}
            onClose={closeTaskDialog}
            onSubmit={handleTaskDialogSubmit}
          />
        )}
      </div>
    </DragDropContext>
  );
}
