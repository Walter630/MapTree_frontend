import { createRouter, createWebHistory } from 'vue-router'

// Firebase Auth
// import { onAuthStateChanged } from "firebase/auth";
import MainComponent from '@/components/MainView/MainComponent.vue'
import MensageEmailComponent from '@/components/MainView/MensageEmailComponent.vue'
import LoginPage from '@/pages/LoginPage.vue'
// Importação de Componentes de Rotas
import MainPage from '@/pages/MainPage.vue'

import RecoveryPage from '@/pages/RecoveryPage.vue'

// Store
import { useAppStore } from '@/stores/app.ts'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainPage,
      children: [
        {
          path: '',
          name: 'Main',
          component: MainComponent,
          meta: { requiresAuth: true },
        },
        {
          path: 'logout',
          name: 'Logout',
          component: MainComponent,
          meta: { requiresAuth: false },
        },
        {
          path: 'login',
          name: 'Login',
          component: LoginPage,
          meta: { requiresAuth: false },
        },
        {
          path: 'recovery',
          name: 'recovery',
          component: RecoveryPage,
          meta: { requiresAuth: false },
        },
        {
          path: 'recovery-code',
          name: 'recovery-code',
          component: MensageEmailComponent,
          meta: { requiresAuth: false },
        },
      ],
    },
  ],
})

// router.beforeEach((to, from, next) => {
// localStorage.removeItem('user-data')
// const store = useAppStore()
// const auth = store.getAuthInstance

// let alreadyCalled = false // Controlador para evitar chamadas duplicadas

// onAuthStateChanged(auth, (user) => {
// if (alreadyCalled) return // Se já foi chamado, não continua
// alreadyCalled = true // Marca como já chamado

// if (user && to.matched.some((record) => record.meta.requiresAuth)) {
//   // Usuário está logado e a rota requer autenticação
//   next()
// } else if (!user && to.matched.some((record) => record.meta.requiresAuth)) {
//   // Usuário não está logado e a rota requer autenticação
//  next({ name: 'Admin Login' })
// } else {
//   // Rota não requer autenticação
//   next()
// }
// })
// })

// router.afterEach((to) => {
// document.title = to.name.toString() + ' — MapTree'
// const store = useAppStore()
// setTimeout(() => {
//  store.setLoadingPage(false)
// }, 500)

// setTimeout(() => {
//   window.scrollTo({
//    top: 0,
// behavior: 'smooth'
//   })
// }, 600)
// })

export default router
