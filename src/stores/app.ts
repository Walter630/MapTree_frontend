// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    //
    user: null,
    loadingPage: false,
    auth: null,
    isMobile: false,
    logout: false,
  }),
  actions: {
    setUser (user) {
      this.user = user
    },
    setLoadingPage (loading) {
      this.loadingPage = loading
    },
    setAuth (auth) {
      this.auth = auth
    },
    setIsMobile (isMobile) {
      this.isMobile = isMobile
    },
    logout () {
      this.user = null
    },
  },
})
