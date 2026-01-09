import { create } from 'zustand';
import { groupService } from '@/services/api.service';

interface GroupRead {
  id: number;
  name: string;
  // add other fields as needed
}

interface YearGroup {
  birth_year: number;
  groups: GroupRead[];
  total_groups: number;
}

interface GroupsState {
  groupsData: YearGroup[] | null;
  isLoading: boolean;
  error: Error | null;
  fetchGroups: () => Promise<void>;
  clearGroups: () => void;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groupsData: null,
  isLoading: false,
  error: null,

  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('[GROUPS STORE] Fetching groups from API');
      const response = await groupService.getGroupsGroupedByYear();
      console.log('[GROUPS STORE] Groups fetched successfully:', response.data);
      set({ groupsData: response.data, isLoading: false });
    } catch (error) {
      console.error('[GROUPS STORE] Error fetching groups:', error);
      set({ error: error as Error, isLoading: false });
    }
  },

  clearGroups: () => {
    set({ groupsData: null, error: null });
  },
}));
