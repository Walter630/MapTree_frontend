import type { AiPrediction, MaintenanceSchedule, Measurement, Soil } from '@/plugins/apiConnect'

export interface TreeApiRecord {
  id: string
  age?: string | Date
  latitude?: number | string | null
  longitude?: number | string | null
  lat?: number | string | null
  lng?: number | string | null
  status?: string
  vigor?: string
  speciesId?: string
  idSpecies?: string
  species?: { id?: string; commonName?: string; scientificName?: string; family?: string }
  currentHeight?: number
  estimatedHeight?: number
  estimated_height_m?: number
  wireHeight?: number
  wire_height_m?: number
  soilQuality?: string
  soil?: Soil & { vigor?: string }
  solo?: Soil[]
  aiPrediction?: AiPrediction | null
  measurements?: Measurement[]
  maintenanceSchedule?: MaintenanceSchedule[]
  nestObservations?: { quantity: number; estimatedAgeYears?: number; averageSizeCm?: number }[]
}

export interface ScheduleApiRecord {
  id: string
  idTree?: string
  status: string
  plannedDate: string
  tree?: TreeApiRecord
}

export interface PruningApiRecord {
  id: string
  idTree: string
  idUser?: string
  tree?: TreeApiRecord
  user?: { id?: string; name?: string }
  date: string
  observations?: string
  type: string
}

export interface TreeNotification {
  id?: string
  type: string
  titulo: string
  descricao: string
  tempo: string
  prioridade: string
  prioridadeCor: string
  icon: string
  iconColor: string
  status?: string
  botaoCor?: string
  link?: string
  isNew?: boolean
}
