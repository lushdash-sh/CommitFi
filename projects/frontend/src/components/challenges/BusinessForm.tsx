import type { ChangeEvent } from 'react'

export interface BusinessFormData {
  title: string
  description: string
  stakeAmount: number
  durationDays: number
  reviewPeriodHours: number
  companyAName: string
  companyBAddress: string
  companyBName: string
  deliverableType: string
}

interface BusinessFormProps {
  formData: BusinessFormData
  loading: boolean
  onChange: (data: BusinessFormData) => void
  onSubmit: () => void
}

const BusinessForm = ({ formData, loading, onChange, onSubmit }: BusinessFormProps) => {
  const onInputChange = <K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) => {
    onChange({ ...formData, [key]: value })
  }

  const preventSubmitReload = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="space-y-6" onSubmit={preventSubmitReload}>
      <div>
        <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Agreement Title</label>
        <input
          className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
          placeholder="e.g. Enterprise Software Delivery Contract"
          value={formData.title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('title', event.target.value)}
        />
      </div>

      <div>
        <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Description & Requirements</label>
        <textarea
          className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono h-24 resize-none"
          placeholder="Describe the exact deliverables required for escrow release..."
          value={formData.description}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onInputChange('description', event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-neon-blue font-mono text-xs uppercase mb-2">Your Company Name (A)</label>
          <input
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-blue outline-none font-mono"
            placeholder="e.g. Acme Corp"
            value={formData.companyAName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('companyAName', event.target.value)}
          />
        </div>
        <div>
          <label className="block text-neon-pink font-mono text-xs uppercase mb-2">Counterparty Name (B)</label>
          <input
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-pink outline-none font-mono"
            placeholder="e.g. Dev Studio LLC"
            value={formData.companyBName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('companyBName', event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-neon-pink font-mono text-xs uppercase mb-2">Counterparty Wallet Address (Company B)</label>
        <input
          className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-pink outline-none font-mono"
          placeholder="Paste Algorand Wallet Address..."
          value={formData.companyBAddress}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('companyBAddress', event.target.value)}
        />
        <p className="text-gray-500 text-xs font-mono mt-1">This wallet will receive the contract request in their Vault.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Escrow Amount (ALGO)</label>
          <input
            type="number"
            min={1}
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            value={formData.stakeAmount}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('stakeAmount', Number(event.target.value))}
          />
        </div>

        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Project Deadline (Days)</label>
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
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Review Period (Hours)</label>
          <input
            type="number"
            min={1}
            max={240}
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono"
            placeholder="e.g. 48"
            value={formData.reviewPeriodHours}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onInputChange('reviewPeriodHours', Number(event.target.value))}
          />
          <p className="text-gray-500 text-xs font-mono mt-1">Time for Company A to review and approve/reject</p>
        </div>

        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Deliverable Type</label>
          <select
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono cursor-pointer"
            value={formData.deliverableType}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onInputChange('deliverableType', event.target.value)
            }
          >
            <option value="pdf">PDF Report</option>
            <option value="document">Document</option>
            <option value="software">Software/Code</option>
            <option value="presentation">Presentation</option>
            <option value="data">Data Package</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="p-4 border border-neon-green/20 rounded-lg bg-black/30">
        <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-3">Business Agreement Flow</h3>
        <ul className="space-y-2 text-gray-300 text-sm font-mono">
          <li className="flex gap-2"><span className="text-neon-green">1.</span><span>You (Company A) create contract and stake ALGO</span></li>
          <li className="flex gap-2"><span className="text-neon-green">2.</span><span>Company B accepts the request in their Vault</span></li>
          <li className="flex gap-2"><span className="text-neon-green">3.</span><span>Company B submits deliverable document with SHA-256 hash</span></li>
          <li className="flex gap-2"><span className="text-neon-green">4.</span><span>Review period starts ({formData.reviewPeriodHours || 48} hours)</span></li>
          <li className="flex gap-2"><span className="text-neon-green">5.</span><span>You review and approve or reject</span></li>
          <li className="flex gap-2"><span className="text-neon-green">6.</span><span>Optimistic execution: Auto-refund if no rejection</span></li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 mt-4 bg-gradient-to-r from-neon-green to-neon-blue text-black font-bold font-mono text-xl rounded shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_40px_rgba(0,255,136,0.6)] transition-all uppercase tracking-wider disabled:opacity-50"
      >
        {loading ? 'CREATING AGREEMENT...' : 'LOCK ESCROW & CREATE'}
      </button>
    </form>
  )
}

export default BusinessForm