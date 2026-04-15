export type FitnessActivityType = 'running' | 'cycling' | 'walking' | 'calories' | 'steps'

export interface StravaActivity {
  id: number
  type: string
  distance?: number
  calories?: number
  steps?: number
  start_date?: string
}

interface StravaAuthResult {
  code: string
  state?: string
}

interface StravaTokenResponse {
  access_token: string
  expires_at?: number
}

interface StravaCheckResponse {
  completed: boolean
}

export const getStravaOAuthUrl = (): string => {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined
  const redirectUri =
    (import.meta.env.VITE_STRAVA_REDIRECT_URI as string | undefined) || window.location.origin + window.location.pathname
  const state = crypto.randomUUID()

  if (!clientId) {
    throw new Error('Missing VITE_STRAVA_CLIENT_ID in frontend .env')
  }

  sessionStorage.setItem('strava_oauth_state', state)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'force',
    state,
    scope: 'activity:read_all',
  })

  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

export const redirectToStravaAuth = (): void => {
  window.location.href = getStravaOAuthUrl()
}

export const parseStravaAuthFromUrl = (search: string): StravaAuthResult | null => {
  if (!search.startsWith('?')) return null

  const params = new URLSearchParams(search)
  const code = params.get('code')
  const state = params.get('state') ?? undefined
  const error = params.get('error')

  if (error) {
    throw new Error(`Strava authorization failed: ${error}`)
  }

  if (!code) return null

  return { code, state }
}

export const exchangeStravaCodeForToken = async (code: string): Promise<StravaTokenResponse> => {
  const endpoint =
    (import.meta.env.VITE_STRAVA_TOKEN_EXCHANGE_URL as string | undefined) || '/api/strava'

  const redirectUri =
    (import.meta.env.VITE_STRAVA_REDIRECT_URI as string | undefined) || window.location.origin + window.location.pathname

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'token', code, redirectUri }),
  })

  if (!response.ok) {
    throw new Error(`Strava token exchange failed with status ${response.status}`)
  }

  const tokenResult = (await response.json()) as StravaTokenResponse
  if (!tokenResult.access_token) {
    throw new Error('Strava token exchange did not return access_token')
  }

  return tokenResult
}

export const fetchAthleteActivities = async (
  accessToken: string,
  fromTimestamp?: number,
  toTimestamp?: number,
): Promise<StravaActivity[]> => {
  const response = await fetch('/api/strava', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'activities',
      accessToken,
      fromTimestamp,
      toTimestamp,
    }),
  })

  if (!response.ok) {
    throw new Error(`Strava activities fetch failed with status ${response.status}`)
  }

  const activities = (await response.json()) as StravaActivity[]
  return activities
}

export const checkFitnessChallengeCompletion = async (params: {
  accessToken: string
  activityType: FitnessActivityType
  targetGoal: string
  fromTimestamp?: number
  toTimestamp?: number
}): Promise<boolean> => {
  const { accessToken, activityType, targetGoal, fromTimestamp, toTimestamp } = params

  const response = await fetch('/api/strava', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'check-completion',
      accessToken,
      activityType,
      targetGoal,
      fromTimestamp,
      toTimestamp,
    }),
  })

  if (!response.ok) {
    throw new Error(`Fitness completion check failed with status ${response.status}`)
  }

  const result = (await response.json()) as StravaCheckResponse
  return Boolean(result.completed)
}
