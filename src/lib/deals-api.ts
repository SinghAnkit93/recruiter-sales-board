import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Deal = Tables<"deals">;
export type Activity = Tables<"activities">;
export type Profile = Tables<"profiles">;

export const dealsQuery = queryOptions({
  queryKey: ["deals"],
  queryFn: async (): Promise<Deal[]> => {
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async (): Promise<Profile[]> => {
    const { data, error } = await supabase.from("profiles").select("*").order("full_name");
    if (error) throw error;
    return data;
  },
});

export const activitiesQuery = (dealId: string) =>
  queryOptions({
    queryKey: ["activities", dealId],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

/** Latest activity time per deal, for "last interaction". */
export const lastTouchQuery = queryOptions({
  queryKey: ["activities", "last-touch"],
  queryFn: async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase
      .from("activities")
      .select("deal_id, created_at")
      .neq("type", "stage")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of data) if (!map[row.deal_id]) map[row.deal_id] = row.created_at;
    return map;
  },
});

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"deals">) => {
      const { data, error } = await supabase.from("deals").insert(input).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"deals"> }) => {
      const { error } = await supabase.from("deals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["deals"] });
      const prev = qc.getQueryData<Deal[]>(["deals"]);
      qc.setQueryData<Deal[]>(["deals"], (old) =>
        old?.map((d) => (d.id === id ? ({ ...d, ...patch } as Deal) : d)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deals"], ctx.prev);
    },
    onSettled: (_d, _e, { id, patch }) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      if (patch.stage) qc.invalidateQueries({ queryKey: ["activities", id] });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"activities">) => {
      const { error } = await supabase.from("activities").insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["activities", input.deal_id] });
      qc.invalidateQueries({ queryKey: ["activities", "last-touch"] });
    },
  });
}
