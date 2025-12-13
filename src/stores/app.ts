// Utilities
import { defineStore } from 'pinia'
import type { Pruning, User } from '@/plugins/apiConnect'

export const useAppStore = defineStore('app', {
  state: () => ({
    user: null as User | null,
    isMobile: false,
    loadingPage: false,
    pruningTypes: [] as Pruning[],
  }),

  actions: {
    setUser(user: User | null) {
      this.user = user
    },
    getUser(user: User | null) {
      this.user = user
    },

    setPruningTypes(pruningTypes: Pruning[]) {
      this.pruningTypes = pruningTypes
    },
    addPruning(pruning: Pruning) {
      this.pruningTypes.unshift(pruning)
    },

    setIsMobile(value: boolean) {
      this.isMobile = value
    },

    setLoadingPage(value: boolean) {
      this.loadingPage = value
    },
  },

  getters: {
    getOrganizationId(): string | null {
      return this.user?.organization?.id || null
    },
  },
})
