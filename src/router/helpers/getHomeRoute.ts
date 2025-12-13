import type { Router } from 'vue-router'

export function getHomeRouteByRole(router: Router, role: string | undefined): string {
  const routes = router.getRoutes()

  const homeRoute = routes.find(
    (route) => route.meta?.home === true && route.meta?.role === (role ?? 'GUEST'),
  )

  return homeRoute?.path || '/login'
}
