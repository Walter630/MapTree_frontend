import { createRouter, createWebHistory } from 'vue-router'
import { apiConnect, type User } from '@/plugins/apiConnect'
import { useAppStore } from '@/stores/app'

/* ===================================
   IMPORTS — Páginas Públicas
=================================== */

import MainPage from '@/pages/MainPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import RecoveryPage from '@/pages/RecoveryPage.vue'
import MainComponent from '@/components/MainView/MainComponent.vue'
import RegisterComponent from '@/components/MainView/RegisterComponent.vue'
import EmailMessageComponent from '@/components/MainView/EmailMessageComponent.vue'
import ResetPasswordComponent from '@/components/MainView/ResetPasswordComponent.vue'

/* ===================================
   IMPORTS — Admin
=================================== */

import AdminPage from '@/pages/AdminPage.vue'
import AdminMainComponent from '@/components/AdminView/MainComponentAdmin.vue'
import AdminManagersView from '@/components/AdminView/AdminManagersView.vue'
import AdminCompaniesView from '@/components/AdminView/AdminCompaniesView.vue'
import AdminRegisterCompanyView from '@/components/AdminView/AdminRegisterCompanyView.vue'
import AdminRegisterManagersView from '@/components/AdminView/AdminRegisterManagersView.vue'

/* ===================================
   IMPORTS — Gestor (Manager)
=================================== */

import ManagerPage from '@/pages/GestorPage.vue'
import ManagerMainComponent from '@/components/GestorView/ManagerMainComponent.vue'
import ManagerEmployeesView from '@/components/GestorView/ManagerEmployeesView.vue'
import RegisterEmployee from '@/components/GestorView/RegisterEmployee.vue'
import ManagerReportsView from '@/components/GestorView/ManagerReportsView.vue'
import ManagerNotificationsView from '@/components/GestorView/ManagerNotificationsView.vue'

/* ===================================
   IMPORTS — Usuário (Funcionário)
=================================== */

import UserPage from '@/pages/UserPage.vue'
import MapPage from '@/pages/map/MapPage.vue'
import ReportsPage from '@/pages/ReportsPage.vue'
import NotificationPage from '@/pages/NotificationPage.vue'
import PruningList from '@/pages/PruningList.vue'
import PruningRegistration from '@/pages/PruningRegistration.vue'
import LogoutPage from '@/pages/LogoutPage.vue'
import NovaPagina from '@/pages/NovaPagina.vue'

/* ===================================
   DEFINIÇÃO DAS ROTAS
=================================== */

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainPage,
      children: [
        /* --- Rotas Públicas --- */
        { path: '', name: 'Main', component: MainComponent, meta: { requiresAuth: true } },
        { path: 'login', name: 'Login', component: LoginPage },
        { path: 'register', name: 'Register', component: RegisterComponent },
        { path: 'recovery', name: 'Recovery', component: RecoveryPage },
        { path: 'recovery-code', name: 'RecoveryCode', component: EmailMessageComponent },
        { path: 'reset-password', name: 'ResetPassword', component: ResetPasswordComponent },
        { path: 'logout', name: 'Logout', component: LogoutPage },
        { path: 'nova-pagina', name: 'NovaPagina', component: NovaPagina },
        { path: 'edit-account', name: 'EditAccount', component: () => import('@/components/MainView/EditProfileComponent.vue') },

        /* --- Admin --- */
        {
          path: 'admin',
          component: AdminPage,
          meta: { requiresAuth: true, role: 'ADMIN', home: true },
          children: [
            { path: '', name: 'AdminHome', component: AdminMainComponent },
            { path: 'managers', name: 'AdminManagers', component: AdminManagersView },
            { path: 'companies', name: 'AdminCompanies', component: AdminCompaniesView },
            { path: 'register-company', name: 'AdminRegisterCompany', component: AdminRegisterCompanyView },
            { path: 'register-managers', name: 'AdminRegisterManagers', component: AdminRegisterManagersView },
            { path: 'map', name: 'AdminMap', component: MapPage },
          ],
        },

        /* --- Gestor (Manager) --- */
        {
          path: 'manager',
          component: ManagerPage,
          meta: { requiresAuth: true, role: 'MANAGER', home: true },
          children: [
            { path: '', name: 'ManagerHome', component: ManagerMainComponent },
            { path: 'employees', name: 'ManagerEmployees', component: ManagerEmployeesView },
            { path: 'register-employee', name: 'RegisterEmployee', component: RegisterEmployee },
            { path: 'reports', name: 'ManagerReports', component: ManagerReportsView },
            {
              path: 'notifications',
              name: 'ManagerNotifications',
              component: ManagerNotificationsView,
              meta: { notification: true, role: 'MANAGER' },
            },
            { path: 'map', name: 'ManagerMap', component: MapPage },
          ],
        },

        /* --- Usuário (Funcionário) --- */
        {
          path: 'user',
          name: 'Employees',
          component: UserPage,
          meta: { requiresAuth: true, role: 'USER', home: true },
          children: [
            { path: '', name: 'UserHome', component: MainComponent },
            { path: 'reports', name: 'UserReports', component: ReportsPage },
            { path: 'mapUser', name: 'Map', component: MapPage },
            { path: 'podas', name: 'PruningList', component: PruningList },
            { path: 'podas/nova', name: 'PruningRegistration', component: PruningRegistration },
            {
              path: 'notifications',
              name: 'UserNotifications',
              component: NotificationPage,
              meta: { notification: true, role: 'USER' },
            },
          ],
        },
      ],
    },
  ],
})

/* ===================================
   GUARD — Autenticação (beforeEach)
=================================== */

router.beforeEach(async (to, _from, next) => {
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const store = useAppStore()

  // 1. Rotas públicas: Lança direto
  if (!requiresAuth) return next()

  // 2. Verifica token
  try {
    const { data: verifyData } = await apiConnect.get<{ valid: boolean }>('/auth/verify-token')
    if (!verifyData.valid) {
      store.logout()
      return next({ name: 'Login' })
    }

    // 3. Garante que temos o usuário no Store
    if (!store.user) {
      const { data: userData } = await apiConnect.get<User>('users/me/profile')
      store.getUser(userData)
    }

    const user = store.user
    if (!user) return next({ name: 'Login' })

    // 4. Verificação de Role REFORÇADA
    // Percorre todos os níveis da rota (ex: /admin/managers) procurando restrições de role
    const requiredRole = to.matched.find(record => record.meta.role)?.meta.role

    if (requiredRole && user.role !== requiredRole) {
      console.warn(`Acesso negado: Usuário ${user.role} tentou acessar rota de ${requiredRole}`)
      store.logout() // Opcional: Desloga por segurança ou apenas redireciona
      return next({ name: 'Login' }) 
    }

    next()
  } catch (error) {
    console.error('Erro de segurança no Router:', error)
    store.logout()
    next({ name: 'Login' })
  }
})

export default router
