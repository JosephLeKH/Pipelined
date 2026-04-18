/** Drag-and-drop state and handlers for KanbanBoard. */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toast } from "sonner";
import { useUpdateApplication } from "./useApplications";

export function useKanbanDrag({ applications, stages, queryKey }) {
  const [activeId, setActiveId] = useState(null);
  const queryClient = useQueryClient();
  const updateMutation = useUpdateApplication();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeApp = activeId ? applications.find((a) => a.id === activeId) : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const srcApp = applications.find((a) => a.id === active.id);
    if (!srcApp) return;
    const targetStage = stages.includes(over.id)
      ? over.id
      : (applications.find((a) => a.id === over.id)?.current_stage ?? null);
    if (!targetStage || srcApp.current_stage === targetStage) return;
    const previousData = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) =>
      old ? { ...old, data: old.data.map((a) => a.id === active.id ? { ...a, current_stage: targetStage } : a) } : old
    );
    updateMutation.mutate({ id: active.id, body: { current_stage: targetStage } }, {
      onSuccess: () => toast.success(`Moved to ${targetStage}`, {
        action: { label: "Undo", onClick: () => updateMutation.mutate({ id: active.id, body: { current_stage: srcApp.current_stage } }) },
        duration: 5000,
      }),
      onError: () => {
        queryClient.setQueryData(queryKey, previousData);
        toast.error("Move failed — reverted");
      },
    });
  };

  return { activeId, activeApp, sensors, handleDragStart, handleDragEnd };
}
