// Utilities
import { defineStore } from 'pinia'
import type { User } from '@/plugins/apiConnect.ts'

export const useAppStore = defineStore('app', {
  state: () => ({
    //
    user: {},
    loadingPage: false,
    auth: null,
    isMobile: false,
    logout: false,
  }),
  actions: {
    setUser (user: User) {
      this.user = user
    },
    setLoadingPage (loading: boolean) {
      this.loadingPage = loading
    },
    setIsMobile (isMobile: boolean) {
      this.isMobile = isMobile
    },
    logout () {
      this.user = {};
    },
  },
})
