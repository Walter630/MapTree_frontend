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
import TreeRegistrationPage from '@/pages/TreeRegistrationPage.vue'
import DailyRoutesPage from '@/pages/DailyRoutesPage.vue'
import DashboardPreviewsPage from '@/pages/DashboardPreviewsPage.vue'

/* ===================================
   DEFINIÇÃO DAS ROTAS
=================================== */

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainPage,
      meta: { requiresAuth: true },
      children: [
        /* --- Rotas Públicas --- */
        { path: '', name: 'Main', component: MainComponent, meta: { requiresAuth: true } },
        { path: 'login', name: 'Login', meta: { public: true }, component: LoginPage },
        {
          path: 'register',
          name: 'Register',
          meta: { public: true },
          component: RegisterComponent,
        },
        { path: 'recovery', name: 'Recovery', meta: { public: true }, component: RecoveryPage },
        {
          path: 'recovery-code',
          name: 'RecoveryCode',
          meta: { public: true },
          redirect: { name: 'Recovery' },
        },
        {
          path: 'reset-password',
          name: 'ResetPassword',
          meta: { public: true },
          redirect: { name: 'Recovery' },
        },
        { path: 'logout', name: 'Logout', component: LogoutPage },
        { path: 'nova-pagina', name: 'NovaPagina', component: NovaPagina, meta: { role: 'ADMIN' } },
        {
          path: 'dashboard-previews',
          name: 'DashboardPreviews',
          component: DashboardPreviewsPage,
          meta: { role: 'ADMIN' },
        },
        {
          path: 'edit-account',
          name: 'EditAccount',
          component: () => import('@/components/MainView/EditProfileComponent.vue'),
        },

        /* --- Admin --- */
        {
          path: 'admin',
          component: AdminPage,
          meta: { requiresAuth: true, role: 'ADMIN', home: true },
          children: [
            { path: '', name: 'AdminHome', component: AdminMainComponent },
            { path: 'managers', name: 'AdminManagers', component: AdminManagersView },
            { path: 'companies', name: 'AdminCompanies', component: AdminCompaniesView },
            {
              path: 'register-company',
              name: 'AdminRegisterCompany',
              component: AdminRegisterCompanyView,
            },
            {
              path: 'register-managers',
              name: 'AdminRegisterManagers',
              component: AdminRegisterManagersView,
            },
            { path: 'trees/new', name: 'AdminTreeRegistration', component: TreeRegistrationPage },
            { path: 'map', name: 'AdminMap', component: MapPage },
            { path: 'routes/daily', name: 'AdminDailyRoutes', component: DailyRoutesPage },
            { path: 'podas', name: 'AdminPruningList', component: PruningList },
            {
              path: 'podas/nova',
              name: 'AdminPruningRegistration',
              component: PruningRegistration,
            },
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
            { path: 'trees/new', name: 'ManagerTreeRegistration', component: TreeRegistrationPage },
            { path: 'routes/daily', name: 'ManagerDailyRoutes', component: DailyRoutesPage },
            { path: 'podas', name: 'ManagerPruningList', component: PruningList },
            {
              path: 'podas/nova',
              name: 'ManagerPruningRegistration',
              component: PruningRegistration,
            },
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
            { path: 'trees/new', name: 'UserTreeRegistration', component: TreeRegistrationPage },
            { path: 'reports', name: 'UserReports', component: ReportsPage },
            { path: 'mapUser', name: 'Map', component: MapPage },
            { path: 'routes/daily', name: 'UserDailyRoutes', component: DailyRoutesPage },
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
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/* ===================================
   GUARD — Autenticação (beforeEach)
=================================== */

router.beforeEach(async (to, _from, next) => {
  const requiresAuth = to.meta.public !== true
  const store = useAppStore()

  // 1. Rotas públicas: libera direto
  if (!requiresAuth) return next()

  // 2. Sem token salvo => nem tenta chamar a API, manda pro login.
  //    (evita requisições desnecessárias e flicker)
  if (!apiConnect.isAuthenticated()) {
    return next({ name: 'Login' })
  }

  // 3. Garante que temos o usuário no store.
  //    Em recarregamento de página (F5) o store é zerado, então rebuscamos o perfil.
  try {
    if (!store.user) {
      const { data: userData } = await apiConnect.get<User>('/users/me/profile')
      store.setUser(userData)
    }
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status

    // Só desloga se o servidor disser explicitamente que a sessão é inválida (401/403).
    // O interceptor do axios já tenta o refresh do token antes de chegar aqui.
    if (status === 401 || status === 403) {
      store.logout()
      return next({ name: 'Login' })
    }

    // Preserva o token em falha temporária, mas não libera a página sem validar o perfil.
    console.error('Não foi possível validar o acesso:', error)
    return next({ name: 'Login', query: { reason: 'session-unavailable' } })
  }

  const user = store.user
  if (!user) return next({ name: 'Login' })
  if (to.name === 'Main') {
    const home = { ADMIN: '/admin', MANAGER: '/manager', USER: '/user' }[user.role]
    return home ? next(home) : next({ name: 'Login' })
  }

  // 4. Verificação de role: se a role não bate, NÃO desloga.
  //    Apenas redireciona o usuário para a home da própria role.
  const requiredRole = to.meta.role

  if (requiredRole && user.role !== requiredRole) {
    console.warn(`Acesso negado: usuário ${user.role} tentou acessar rota de ${requiredRole}`)
    const homePathByRole: Record<string, string> = {
      ADMIN: '/admin',
      MANAGER: '/manager',
      USER: '/user',
    }
    const home = homePathByRole[user.role]
    // Evita loop: se já não houver home mapeada, cai no login.
    return home ? next(home) : next({ name: 'Login' })
  }

  next()
})

export default router
