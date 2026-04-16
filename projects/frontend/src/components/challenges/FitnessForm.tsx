import type { ChangeEvent, FormEvent } from 'react'
import type { FitnessActivityType } from '../../services/StravaService'

export interface FitnessFormData {
  title: string
  description: string
  stakeAmount: number
  durationDays: number
  activityType: FitnessActivityType
  targetGoal: string
}

interface FitnessFormProps {
  formData: FitnessFormData
  loading: boolean
  stravaToken: string | null
  onChange: (data: FitnessFormData) => void
  onConnectStrava: () => void
  onSubmit: () => void
}

const FitnessForm = ({
  formData,
  loading,
  stravaToken,
  onChange,
  onConnectStrava,
  onSubmit,
}: FitnessFormProps) => {
  const onInputChange = <K extends keyof FitnessFormData>(key: K, value: FitnessFormData[K]) => {
    onChange({ ...formData, [key]: value })
  }

  const preventSubmitReload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="space-y-6" onSubmit={preventSubmitReload}>
      <div>
        <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Challenge Title</label>
        <input
          className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
          placeholder="e.g. 30-Day Cardio Sprint"
          value={formData.title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('title', event.target.value)}
        />
      </div>

      <div>
        <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Description</label>
        <textarea
          className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono h-24 resize-none"
          placeholder="Describe your fitness commitment..."
          value={formData.description}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onInputChange('description', event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Stake Amount (ALGO)</label>
          <input
            type="number"
            min={1}
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            value={formData.stakeAmount}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('stakeAmount', Number(event.target.value))}
          />
        </div>

        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Duration (Days)</label>
          <input
            type="number"
            min={1}
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            value={formData.durationDays}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('durationDays', Number(event.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Activity Type</label>
          <select
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono cursor-pointer"
            value={formData.activityType}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onInputChange('activityType', event.target.value as FitnessActivityType)
            }
          >
            <option value="running">Running</option>
            <option value="cycling">Cycling</option>
            <option value="walking">Walking</option>
            <option value="calories">Calories Burn</option>
            <option value="steps">Steps</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Target Goal</label>
          <input
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            placeholder="e.g. 5 km per day / 10000 steps / 300 calories"
            value={formData.targetGoal}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('targetGoal', event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-neon-green/20 rounded-lg bg-black/30">
        <div>
          <p className="text-neon-green font-mono text-sm uppercase tracking-wider">Strava Status</p>
          <p className="text-gray-300 text-sm font-mono mt-1">
            {stravaToken ? 'Connected and ready to verify activities.' : 'Not connected. Connect before creating fitness challenge.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onConnectStrava}
          className="px-5 py-3 rounded-lg bg-gradient-to-r from-neon-green to-neon-blue text-cyber-black font-bold font-mono text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all"
        >
          Connect with Strava
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 mt-4 bg-gradient-to-r from-neon-green to-neon-blue text-black font-bold font-mono text-xl rounded shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_40px_rgba(0,255,136,0.6)] transition-all uppercase tracking-wider disabled:opacity-50"
      >
        {loading ? 'CREATING FITNESS CHALLENGE...' : 'CREATE FITNESS CHALLENGE'}
      </button>
    </form>
  )
}

export default FitnessForm
