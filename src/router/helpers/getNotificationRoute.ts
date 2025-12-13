import type { Router } from 'vue-router'

export function getNotificationRoute(router: Router, role: string | undefined): string {
  const routes = router.getRoutes()

  const notificationRoute = routes.find(
    (route) => route.meta?.notification === true && route.meta?.role === (role ?? 'GUEST'),
  )

  return notificationRoute?.path || '/login'
}
