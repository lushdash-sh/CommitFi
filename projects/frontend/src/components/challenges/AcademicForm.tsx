import type { ChangeEvent } from 'react'

export interface AcademicFormData {
  title: string
  description: string
  stakeAmount: number
  maxMembers: number
  durationValue: number
  durationUnit: 'hours' | 'days' | 'months'
  templateUrl: string
}

interface AcademicFormProps {
  formData: AcademicFormData
  loading: boolean
  onChange: (data: AcademicFormData) => void
  onSubmit: () => void
}

const AcademicForm = ({ formData, loading, onChange, onSubmit }: AcademicFormProps) => {
  const onInputChange = <K extends keyof AcademicFormData>(key: K, value: AcademicFormData[K]) => {
    onChange({ ...formData, [key]: value })
  }

  const preventSubmitReload = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="space-y-6" onSubmit={preventSubmitReload}>
      <div>
        <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Challenge Title</label>
        <input
          className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
          placeholder="e.g. DSA Sprint"
          value={formData.title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('title', event.target.value)}
        />
      </div>

      <div>
        <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Description</label>
        <textarea
          className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono h-24 resize-none"
          placeholder="Describe the goal..."
          value={formData.description}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onInputChange('description', event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Stake (ALGO)</label>
          <input
            type="number"
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            value={formData.stakeAmount}
            min={1}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('stakeAmount', Number(event.target.value))}
          />
        </div>
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Duration</label>
          <div className="flex">
            <input
              type="number"
              className="w-2/3 bg-black/40 border border-gray-700 rounded-l p-4 text-white focus:border-neon-green outline-none font-mono"
              value={formData.durationValue}
              min={1}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('durationValue', Number(event.target.value))}
            />
            <select
              className="w-1/3 bg-gray-900 border border-l-0 border-gray-700 rounded-r text-white focus:border-neon-green outline-none font-mono text-sm px-2 cursor-pointer"
              value={formData.durationUnit}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onInputChange('durationUnit', event.target.value as AcademicFormData['durationUnit'])
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
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Max Participants</label>
          <input
            type="number"
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            value={formData.maxMembers}
            min={1}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('maxMembers', Number(event.target.value))}
          />
        </div>

        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Submission Template URL</label>
          <input
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono text-sm"
            placeholder="https://drive.google.com/..."
            value={formData.templateUrl}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('templateUrl', event.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 mt-4 bg-gradient-to-r from-neon-green to-neon-blue text-black font-bold font-mono text-xl rounded shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_40px_rgba(0,255,136,0.6)] transition-all uppercase tracking-wider disabled:opacity-50"
      >
        {loading ? 'DEPLOYING CONTRACT...' : 'PAY STAKE & CREATE'}
      </button>
    </form>
  )
}

export default AcademicForm
