import { AxiosInstance } from 'axios';
import { Vuetify } from 'vuetify';
import { Router } from 'vue-router';
import { useAppStore } from '@/stores/app';

type Route = Router.currentRoute.value;

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    axios: AxiosInstance;
    $vuetify: Vuetify;
    $router: Router;
    $route: Route;
    $isMobile: () => boolean;
    $refs: Reference;
    $store: useAppStore;
  }
}
