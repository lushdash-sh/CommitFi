import type { ChangeEvent, FormEvent } from 'react'

export interface FitnessFormData {
  title: string
  description: string
  stakeAmount: number
  maxMembers: number
  durationValue: number
  durationUnit: 'hours' | 'days' | 'months'
  activityType: string // Changed to string for free typing
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
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Duration</label>
          <div className="flex">
            <input
              type="number"
              min={1}
              className="w-2/3 bg-black/40 border border-gray-700 rounded-l p-4 text-white focus:border-neon-green outline-none font-mono"
              value={formData.durationValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('durationValue', Number(event.target.value))}
            />
            <select
              className="w-1/3 bg-gray-900 border border-l-0 border-gray-700 rounded-r text-white focus:border-neon-green outline-none font-mono text-sm px-2 cursor-pointer"
              value={formData.durationUnit}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onInputChange('durationUnit', event.target.value as FitnessFormData['durationUnit'])
              }
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="months">Months</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Activity Type</label>
          <input
            type="text"
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            placeholder="e.g. Running, Yoga, Swimming..."
            value={formData.activityType}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('activityType', event.target.value)}
          />
        </div>

        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Max Participants</label>
          <input
            type="number"
            min={1}
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            value={formData.maxMembers}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('maxMembers', Number(event.target.value))}
          />
        </div>
      </div>

      <div className="mb-6">
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Target Goal</label>
          <input
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            placeholder="e.g. 5 km per day / 10000 steps / 300 calories"
            value={formData.targetGoal}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('targetGoal', event.target.value)}
          />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-neon-green/20 rounded-lg bg-black/30">
        <div>
          <p className="text-neon-green font-mono text-sm uppercase tracking-wider">Strava Status</p>
          <p className="text-gray-300 text-sm font-mono mt-1">
            {stravaToken ? 'Connected and ready to verify activities.' : 'Not connected. Connect before creating fitness challenge.'}
          </p>
        </div>
        {/* CONDITIONAL RENDER: Hide button if connected! */}
        {stravaToken ? (
          <div className="px-5 py-3 rounded-lg bg-neon-green/20 border border-neon-green text-neon-green font-bold font-mono text-sm uppercase tracking-wider">
            CONNECTED ✅
          </div>
        ) : (
          <button
            type="button"
            onClick={onConnectStrava}
            className="px-5 py-3 rounded-lg bg-gradient-to-r from-neon-green to-neon-blue text-cyber-black font-bold font-mono text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all"
          >
            Connect with Strava
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 mt-4 bg-gradient-to-r from-neon-green to-neon-blue text-black font-bold font-mono text-xl rounded shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_40px_rgba(0,255,136,0.6)] transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        {loading ? 'CREATING FITNESS CHALLENGE...' : 'CREATE FITNESS CHALLENGE'}
      </button>
    </form>
  )
}

export default FitnessForm