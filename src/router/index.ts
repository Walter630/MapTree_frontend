import { createRouter, createWebHistory } from 'vue-router'

// Public pages
import MainComponent from '@/components/MainView/MainComponent.vue'
import EmailMessageComponent from '@/components/MainView/MensageEmailComponent.vue'
import LoginPage from '@/pages/LoginPage.vue'
import ResetPasswordComponent from '@/components/MainView/ResetSenhaComponent.vue'
import RegisterComponent from '@/components/MainView/RegisterComponent.vue'
import MainPage from '@/pages/MainPage.vue'
import RecoveryPage from '@/pages/RecoveryPage.vue'

// Admin routes
import AdminMainComponent from '@/components/AdminView/MainComponentAdmin.vue'
import AdminManagersView from '@/components/AdminView/AdminManagersView.vue'
import AdminPage from '@/pages/AdminPage.vue'
import AdminCompaniesView from '@/components/AdminView/AdminCompaniesView.vue'
import AdminRegisterCompanyView from '@/components/AdminView/AdminRegisterCompanyView.vue'
import AdminRegisterManagersView from '@/components/AdminView/AdminRegisterManagersView.vue'

// Manager routes
import ManagerPage from '@/pages/GestorPage.vue'
import ManagerMainComponent from '@/components/GestorView/ManagerMainComponent.vue'
import ManagerEmployeesView from '@/components/GestorView/ManagerEmployeesView.vue'
import RegisterEmployee from '@/components/GestorView/RegisterEmployee.vue'
import ManagerReportsView from '@/components/GestorView/ManagerReportsView.vue'
import ManagerNotificationsView from '@/components/GestorView/ManagerNotificationsView.vue'

// Outsourced employee
import OutsourcedEmployeeMain from '@/components/FuncionarioTerceirizadoView/MainFuncionarioTerc.vue'

import { apiConnect, type User } from '@/plugins/apiConnect.ts'
import MainFuncionarioTerc from '@/components/FuncionarioTerceirizadoView/MainFuncionarioTerc.vue'
import mainComponent from '@/components/MainView/MainComponent.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainPage,
      children: [
        { path: '', name: 'Main', component: MainComponent, meta: { requiresAuth: true } },

        // Public routes
        { path: 'login', name: 'Login', component: LoginPage },
        { path: 'register', name: 'Register', component: RegisterComponent },
        { path: 'recovery', name: 'Recovery', component: RecoveryPage },
        { path: 'recovery-code', name: 'RecoveryCode', component: EmailMessageComponent },
        { path: 'reset-password', name: 'ResetPassword', component: ResetPasswordComponent },
        { path: 'logout', name: 'Logout', component: MainComponent },

        /* ============================
           ADMIN ROUTES
        ============================= */
        {
          path: 'admin',
          component: AdminPage,
          meta: { requiresAuth: true, role: 'ADMIN' },
          children: [
            { path: '', name: 'AdminHome', component: AdminMainComponent },
            { path: 'managers', name: 'AdminManagers', component: AdminManagersView },
            { path: 'companies', name: 'AdminCompanies', component: AdminCompaniesView },
            { path: 'register-company', name: 'AdminRegisterCompany', component: AdminRegisterCompanyView },
            { path: 'register-managers', name: 'AdminRegisterManagers', component: AdminRegisterManagersView },
          ],
        },

        /* ============================
           MANAGER ROUTES (GESTOR)
        ============================= */
        {
          path: 'manager',
          component: ManagerPage,
          meta: { requiresAuth: true, role: 'MANAGER' },
          children: [
            { path: '', name: 'ManagerHome', component: ManagerMainComponent },
            { path: 'employees', name: 'ManagerEmployees', component: ManagerEmployeesView },
            { path: 'register-employee', name: 'RegisterEmployee', component: RegisterEmployee },
            { path: 'reports', name: 'ManagerReports', component: ManagerReportsView },
            { path: 'notifications', name: 'ManagerNotifications', component: ManagerNotificationsView },
          ],
        },

        /* ============================
           OUTSOURCED EMPLOYEE
        ============================= */
        {
          path: 'user-outsource',
          component: OutsourcedEmployeeMain,
          meta: { requiresAuth: true, role: 'USER' },
          children: [
            { path: '', name: 'OutsourcedEmployeeHome', component: MainFuncionarioTerc },
          ],
        },
        {
          path: 'user',
          name: 'Employees',
          component: mainComponent,
          meta: { requiresAuth: true, role: 'USER' },
        }
      ],
    },
  ],
})
/*
/* ============================
   BEFORE EACH (AUTH GUARD)
=============================== */

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiredRole = to.meta.role

  // Se a rota NÃO requer autenticação, libera imediatamente
  if (!requiresAuth) {
    return next()
  }

  try {
    // Verifica o token apenas se a rota requer autenticação
    const { data } = await apiConnect.get<{ valid: boolean }>('/auth/verify-token')

    if (!data.valid) {
      return next({ name: 'Login' })
    }

    // Se precisa verificar role, busca o usuário
    if (requiredRole) {
      const { data: user } = await apiConnect.get<User>('users/me/profile')

      if (user.role !== requiredRole) {
        return next({ name: 'Main' })
      }
    }

    next()
  } catch (error) {
    // Se houver erro na validação, redireciona para login
    console.error('Erro na autenticação:', error)
    next({ name: 'Login' })
  }
})

/* ============================
        AFTER EACH
=============================== */
/*
router.afterEach((to) => {
  const store = useAppStore()

  document.title = `${to.name?.toString() ?? 'App'} — MapTree`

  setTimeout(() => store.setLoadingPage(false), 500)

  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, 600)
})*/

export default router
