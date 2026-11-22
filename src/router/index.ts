import { createRouter, createWebHistory } from 'vue-router'
import { apiConnect, type User } from '@/plugins/apiConnect'
import { useAppStore } from '@/stores/app'

/* ===================================
   DEFINIÇÃO DAS ROTAS
=================================== */

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/MainPage.vue'),
      meta: { requiresAuth: true },
      children: [
        /* --- Rotas Públicas --- */
        {
          path: '',
          name: 'Landing',
          component: () => import('@/pages/PublicLandingPage.vue'),
          meta: { public: true },
        },
        {
          path: 'login',
          name: 'Login',
          meta: { public: true },
          component: () => import('@/pages/LoginPage.vue'),
        },
        {
          path: 'cadastro',
          name: 'Register',
          meta: { public: true },
          component: () => import('@/components/MainView/RegisterComponent.vue'),
        },
        {
          path: 'register',
          redirect: { name: 'Register' },
          meta: { public: true },
        },
        {
          path: 'cadastro/solicitacao',
          name: 'ManagerRequestStatus',
          component: () => import('@/pages/ManagerRequestStatusPage.vue'),
        },
        {
          path: 'recovery',
          name: 'Recovery',
          meta: { public: true },
          component: () => import('@/pages/RecoveryPage.vue'),
        },
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
        {
          path: 'logout',
          name: 'Logout',
          component: () => import('@/pages/LogoutPage.vue'),
        },
        {
          path: 'nova-pagina',
          name: 'NovaPagina',
          component: () => import('@/pages/NovaPagina.vue'),
          meta: { role: 'ADMIN' },
        },
        {
          path: 'dashboard-previews',
          name: 'DashboardPreviews',
          component: () => import('@/pages/DashboardPreviewsPage.vue'),
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
          component: () => import('@/pages/AdminPage.vue'),
          meta: { requiresAuth: true, role: 'ADMIN', home: true },
          children: [
            {
              path: '',
              name: 'AdminHome',
              component: () => import('@/components/AdminView/MainComponentAdmin.vue'),
            },
            {
              path: 'managers',
              name: 'AdminManagers',
              component: () => import('@/components/AdminView/AdminManagersView.vue'),
            },
            {
              path: 'manager-requests',
              name: 'AdminManagerRequests',
              component: () => import('@/components/AdminView/AdminManagerRequestsView.vue'),
            },
            {
              path: 'landing',
              name: 'AdminLandingEditor',
              component: () => import('@/pages/AdminLandingEditorPage.vue'),
            },
            {
              path: 'companies',
              name: 'AdminCompanies',
              component: () => import('@/components/AdminView/AdminCompaniesView.vue'),
            },
            {
              path: 'register-company',
              name: 'AdminRegisterCompany',
              component: () => import('@/components/AdminView/AdminRegisterCompanyView.vue'),
            },
            {
              path: 'register-managers',
              name: 'AdminRegisterManagers',
              component: () => import('@/components/AdminView/AdminRegisterManagersView.vue'),
            },
            {
              path: 'trees/new',
              name: 'AdminTreeRegistration',
              component: () => import('@/pages/TreeRegistrationPage.vue'),
            },
            {
              path: 'map',
              name: 'AdminMap',
              component: () => import('@/pages/map/MapPage.vue'),
            },
            {
              path: 'routes/daily',
              name: 'AdminDailyRoutes',
              component: () => import('@/pages/DailyRoutesPage.vue'),
            },
            {
              path: 'podas',
              name: 'AdminPruningList',
              component: () => import('@/pages/PruningList.vue'),
            },
            {
              path: 'podas/nova',
              name: 'AdminPruningRegistration',
              component: () => import('@/pages/PruningRegistration.vue'),
            },
          ],
        },

        /* --- Gestor (Manager) --- */
        {
          path: 'manager',
          component: () => import('@/pages/GestorPage.vue'),
          meta: { requiresAuth: true, role: 'MANAGER', home: true },
          children: [
            {
              path: '',
              name: 'ManagerHome',
              component: () => import('@/components/GestorView/ManagerMainComponent.vue'),
            },
            {
              path: 'employees',
              name: 'ManagerEmployees',
              component: () => import('@/components/GestorView/ManagerEmployeesView.vue'),
            },
            {
              path: 'municipality',
              name: 'ManagerMunicipality',
              component: () => import('@/pages/ManagerMunicipalitySettingsPage.vue'),
            },
            {
              path: 'register-employee',
              name: 'RegisterEmployee',
              component: () => import('@/components/GestorView/RegisterEmployee.vue'),
            },
            {
              path: 'trees/new',
              name: 'ManagerTreeRegistration',
              component: () => import('@/pages/TreeRegistrationPage.vue'),
            },
            {
              path: 'routes/daily',
              name: 'ManagerDailyRoutes',
              component: () => import('@/pages/DailyRoutesPage.vue'),
            },
            {
              path: 'podas',
              name: 'ManagerPruningList',
              component: () => import('@/pages/PruningList.vue'),
            },
            {
              path: 'podas/nova',
              name: 'ManagerPruningRegistration',
              component: () => import('@/pages/PruningRegistration.vue'),
            },
            {
              path: 'reports',
              name: 'ManagerReports',
              component: () => import('@/components/GestorView/ManagerReportsView.vue'),
            },
            {
              path: 'notifications',
              name: 'ManagerNotifications',
              component: () => import('@/components/GestorView/ManagerNotificationsView.vue'),
              meta: { notification: true, role: 'MANAGER' },
            },
            { path: 'map', name: 'ManagerMap', component: () => import('@/pages/map/MapPage.vue') },
          ],
        },

        /* --- Usuário (Funcionário) --- */
        {
          path: 'user',
          name: 'Employees',
          component: () => import('@/pages/UserPage.vue'),
          meta: { requiresAuth: true, role: 'USER', home: true },
          children: [
            {
              path: '',
              name: 'UserHome',
              component: () => import('@/components/MainView/MainComponent.vue'),
            },
            {
              path: 'trees/new',
              name: 'UserTreeRegistration',
              component: () => import('@/pages/TreeRegistrationPage.vue'),
            },
            {
              path: 'trees/:treeId/edit',
              name: 'UserTreeEdit',
              component: () => import('@/pages/TreeRegistrationPage.vue'),
            },
            {
              path: 'reports',
              name: 'UserReports',
              component: () => import('@/pages/ReportsPage.vue'),
            },
            { path: 'mapUser', name: 'Map', component: () => import('@/pages/map/MapPage.vue') },
            {
              path: 'routes/daily',
              name: 'UserDailyRoutes',
              component: () => import('@/pages/DailyRoutesPage.vue'),
            },
            {
              path: 'podas',
              name: 'PruningList',
              component: () => import('@/pages/PruningList.vue'),
            },
            {
              path: 'podas/nova',
              name: 'PruningRegistration',
              component: () => import('@/pages/PruningRegistration.vue'),
            },
            {
              path: 'notifications',
              name: 'UserNotifications',
              component: () => import('@/pages/NotificationPage.vue'),
              meta: { notification: true, role: 'USER' },
            },
          ],
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { public: true },
    },
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

  if (user.role === 'USER' && user.managerRequest && to.path !== '/cadastro/solicitacao') {
    return next('/cadastro/solicitacao')
  }
  if (to.path === '/cadastro/solicitacao' && user.role === 'USER' && !user.managerRequest) {
    return next('/user')
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
