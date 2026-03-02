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
import EmailMessageComponent from '@/components/MainView/MensageEmailComponent.vue'
import ResetPasswordComponent from '@/components/MainView/ResetSenhaComponent.vue'

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
import PodasLista from '@/pages/PodasLista.vue'
import PodasCadastro from '@/pages/PodasCadastro.vue'

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
        { path: 'logout', name: 'Logout', component: MainComponent },

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
            { path: 'podas', name: 'PodasLista', component: PodasLista },
            { path: 'podas/nova', name: 'PodasCadastro', component: PodasCadastro },
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
  const requiredRole = to.meta.role
  const store = useAppStore()

  // Rotas que NÃO requerem autenticação — libera imediatamente
  if (!requiresAuth) return next()

  try {
    const { data } = await apiConnect.get<{ valid: boolean }>('/auth/verify-token')

    if (!data.valid) return next({ name: 'Login' })

    // Verifica role do usuário, se necessário
    if (requiredRole) {
      const { data: user } = await apiConnect.get<User>('users/me/profile')
      store.getUser(user)

      if (user.role !== requiredRole) return next({ name: 'Main' })
    }

    next()
  } catch (error) {
    console.error('Erro na autenticação:', error)
    next({ name: 'Login' })
  }
})

export default router
