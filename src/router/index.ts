import { createRouter, createWebHistory } from 'vue-router'

import MainComponent from '@/components/MainView/MainComponent.vue'
import MensageEmailComponent from '@/components/MainView/MensageEmailComponent.vue'
import LoginPage from '@/pages/LoginPage.vue'
import ResetSenhaComponent from '@/components/MainView/ResetSenhaComponent.vue'
import CadastroComponent from '@/components/MainView/CadastroComponent.vue'
// Importação de Componentes de Rotas
import MainPage from '@/pages/MainPage.vue'

//rotas admin
import MainComponentAdmin from '@/components/AdminView/MainComponentAdmin.vue'
import GestoresAdminoView from '@/components/AdminView/GestoresAdminoView.vue'
import AdminPage from '@/pages/AdminPage.vue'
import EmpresasAdminView from '@/components/AdminView/EmpresasAdminView.vue'
import CadastroEmpresaAdminView from '@/components/AdminView/CadastroEmpresaAdminView.vue'
import CadastroGestoresAdminView from '@/components/AdminView/CadastroGestoresAdminView.vue'


//rotas gestor
import GestorPage from '@/pages/GestorPage.vue'
import MainComponentGestor from '@/components/GestorView/MainComponentGestor.vue'
import FuncionarioGestorView from '@/components/GestorView/FuncionarioGestorView.vue'
import CadastroFuncionario from '@/components/GestorView/CadastroFuncionario.vue'
import RelatoriosGestorView from '@/components/GestorView/RelatoriosGestorView.vue'


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
          path: 'cadastro',
          name: 'Cadastro',
          component: CadastroComponent,
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
        {
          path: 'reset-senha',
          name: 'reset-senha',
          component: ResetSenhaComponent,
          meta: { requiresAuth: false },
        },
        {
          path: 'admin',
          name: 'Admin',
          component: AdminPage,
          children: [
            {
              path: '',
              name: 'AdminHome',
              component: MainComponentAdmin,
              meta: { requiresAuth: false },
            },
            {
              path: 'gestores',
              name: 'Gestores',
              component: GestoresAdminoView,
              meta: { requiresAuth: false },
            },
            {
              path: 'empresas',
              name: 'Empresas',
              component: EmpresasAdminView,
              meta: { requiresAuth: false },
            },
            {
              path: 'cadastro-empresa',
              name: 'CadastroEmpresa',
              component: CadastroEmpresaAdminView,
              meta: { requiresAuth: false },
            },
            {
              path: 'cadastro-gestores',
              name: 'CadastroGestores',
              component: CadastroGestoresAdminView,
              meta: { requiresAuth: false },
            },
          ],
        },
        {
          path: 'gestor',
          name: 'GestorPage',
          component: GestorPage,
          children: [
            {
              path: 'gestorMain',
              name: 'GestorHome',
              component: MainComponentGestor
            },
            {
              path: 'funcionarios',
              name: 'Funcionarios',
              component: FuncionarioGestorView
            },
            {
              path: 'cadastro-funcionario',
              name: 'CadastroFuncionario',
              component: CadastroFuncionario,
              meta: { requiresAuth: false },
            },
            {
              path: 'relatorios',
              name: 'Relatorios',
              component: RelatoriosGestorView
            }
          ]
        }
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
