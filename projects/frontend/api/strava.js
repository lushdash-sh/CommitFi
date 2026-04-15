const STRAVA_OAUTH_BASE = 'https://www.strava.com/oauth'
const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

const allowedActions = new Set(['token', 'activities', 'check-completion'])

const normalizeUnit = (unit) => unit.trim().toLowerCase()

const parseGoalTarget = (targetGoal) => {
  if (typeof targetGoal !== 'string') return null

  const raw = targetGoal.trim().toLowerCase()
  const match = raw.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null

  let unit = raw.replace(match[0], '').trim()
  if (!unit) unit = 'count'

  return { value, unit: normalizeUnit(unit) }
}

const getActivityTypes = (activityType) => {
  switch (activityType) {
    case 'running':
      return ['run', 'virtualrun']
    case 'cycling':
      return ['ride', 'virtualride', 'ebikeride']
    case 'walking':
      return ['walk', 'hike']
    case 'calories':
    case 'steps':
      return []
    default:
      return []
  }
}

const sumByActivityType = (activities, activityType, targetUnit) => {
  if (activityType === 'calories') {
    return activities.reduce((total, item) => total + (item.calories ?? 0), 0)
  }

  if (activityType === 'steps') {
    return activities.reduce((total, item) => total + (item.steps ?? 0), 0)
  }

  const validTypes = getActivityTypes(activityType)
  const totalMeters = activities
    .filter((item) => validTypes.includes(String(item.type || '').toLowerCase()))
    .reduce((total, item) => total + (item.distance ?? 0), 0)

  if (targetUnit.includes('km')) return totalMeters / 1000
  if (targetUnit.includes('mile') || targetUnit === 'mi') return totalMeters / 1609.344
  return totalMeters
}

const getClientId = () => process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID

const json = (res, statusCode, payload) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(payload))
}

const exchangeToken = async (code, redirectUri) => {
  const clientId = getClientId()
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const redirect = process.env.STRAVA_REDIRECT_URI || redirectUri

  if (!clientId || !clientSecret || !redirect) {
    throw new Error('Missing Strava server env vars: STRAVA_CLIENT_ID/VITE_STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI')
  }

  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: Number(clientId),
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirect,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Strava token exchange failed with status ${response.status}: ${details}`)
  }

  return response.json()
}

const fetchActivities = async (accessToken, fromTimestamp, toTimestamp) => {
  const params = new URLSearchParams({ per_page: '200', page: '1' })
  if (fromTimestamp) params.set('after', String(fromTimestamp))
  if (toTimestamp) params.set('before', String(toTimestamp))

  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Strava activities fetch failed with status ${response.status}: ${details}`)
  }

  return response.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Use POST.' })
  }

  try {
    const {
      action,
      code,
      redirectUri,
      accessToken,
      fromTimestamp,
      toTimestamp,
      activityType,
      targetGoal,
    } = req.body || {}

    if (!action || !allowedActions.has(action)) {
      return json(res, 400, { error: 'Invalid action. Use token, activities, or check-completion.' })
    }

    if (action === 'token') {
      if (!code) {
        return json(res, 400, { error: 'Missing code for token exchange.' })
      }

      const tokenPayload = await exchangeToken(code, redirectUri)
      return json(res, 200, {
        access_token: tokenPayload.access_token,
        expires_at: tokenPayload.expires_at,
        athlete: tokenPayload.athlete ?? null,
      })
    }

    if (!accessToken) {
      return json(res, 400, { error: 'Missing accessToken for Strava API request.' })
    }

    const activities = await fetchActivities(accessToken, fromTimestamp, toTimestamp)

    if (action === 'activities') {
      return json(res, 200, activities)
    }

    const parsedGoal = parseGoalTarget(targetGoal)
    if (!parsedGoal) {
      return json(res, 400, { error: 'Target goal must include a numeric value, e.g. 5 km or 10000 steps.' })
    }

    const achieved = sumByActivityType(activities, activityType, parsedGoal.unit)
    return json(res, 200, {
      completed: achieved >= parsedGoal.value,
      achieved,
      target: parsedGoal.value,
      unit: parsedGoal.unit,
      activityCount: Array.isArray(activities) ? activities.length : 0,
    })
  } catch (error) {
    return json(res, 500, {
      error: 'Strava API request failed.',
      details: error instanceof Error ? error.message : 'Unknown server error',
    })
  }
}
